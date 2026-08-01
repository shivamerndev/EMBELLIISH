import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import PaymentModel from './payment.model.js';
import InvoiceModel from '../invoice/invoice.model.js';
import TransactionModel from '../transaction/transaction.model.js';
import ProjectModel from '../../project/project/project.model.js';
import projectService from '../../project/project/project.service.js';
import notify from '../../notification/notification.service.js';
import { PAYMENT_MILESTONE, isSettled } from '../../../constants/workflow.constants.js';
import { round } from '../../../services/consumption.service.js';

const paymentRepository = new BaseRepository(PaymentModel, {
  filterable: ['project', 'client', 'invoice', 'milestone', 'status', 'mode'],
  searchable: ['code', 'referenceNo'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'client', select: 'name phone' },
  ],
  defaultSort: '-receivedAt',
});

/**
 * Steps 9, 10 and 18 — the money that unlocks the rest of the spine.
 *
 * Recording a cleared payment is the single most consequential write in the
 * system: it is what lets a project become Active, and what lets an installation
 * be scheduled. So every receipt also posts to the ledger, updates its invoice,
 * and asks the project whether it can now move on.
 */
class PaymentService extends BaseService {
  constructor() {
    super(paymentRepository, 'Payment');
  }

  async create(data, user) {
    const project = await ProjectModel.findById(data.project).lean();
    if (!project) throw ApiError.notFound('Project not found');

    if (!project.contractValue && data.milestone !== 'OTHER') {
      throw ApiError.workflow(
        'No approved quotation yet, so there is no contract value to receive a milestone payment against'
      );
    }

    this.#assertNotOverpaid(project, data);

    const payment = await PaymentModel.create({
      ...data,
      code: await nextCode('PAY'),
      client: data.client || project.client,
      clearedAt: data.status === 'CLEARED' ? data.clearedAt || new Date() : undefined,
      recordedBy: user?.id,
    });

    if (payment.status === 'CLEARED') {
      await this.#postCleared(payment, project, user);
    }

    return payment.toJSON();
  }

  /** A cheque clearing later is what actually opens the gate. */
  async clear(id, { clearedAt } = {}, user) {
    const payment = await PaymentModel.findById(id);
    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.status === 'CLEARED') throw ApiError.conflict('Payment is already cleared');

    payment.status = 'CLEARED';
    payment.clearedAt = clearedAt || new Date();
    await payment.save();

    const project = await ProjectModel.findById(payment.project).lean();
    await this.#postCleared(payment, project, user);

    return payment.toJSON();
  }

  async bounce(id, { remarks } = {}, user) {
    const payment = await PaymentModel.findById(id);
    if (!payment) throw ApiError.notFound('Payment not found');

    const wasCleared = payment.status === 'CLEARED';
    payment.status = 'BOUNCED';
    payment.remarks = remarks;
    await payment.save();

    // Reverse the earlier posting so the invoice and ledger stay truthful. The
    // project stage is deliberately left alone — unwinding an activation is a
    // decision for a human, not a side effect of a bounced cheque.
    if (wasCleared) {
      if (payment.invoice) {
        const invoice = await InvoiceModel.findById(payment.invoice);
        if (invoice) {
          invoice.amountPaid = Math.max(0, round(invoice.amountPaid - payment.amount, 2));
          invoice.status = invoice.amountPaid <= 0 ? 'ISSUED' : 'PARTIALLY_PAID';
          await invoice.save();
        }
      }

      await TransactionModel.create({
        code: await nextCode('TXN'),
        project: payment.project,
        direction: 'DEBIT',
        category: 'REFUND',
        amount: payment.amount,
        description: `Reversal of bounced payment ${payment.code}`,
        payment: payment._id,
        recordedBy: user?.id,
      });
    }

    return payment.toJSON();
  }

  /** What the accounts tab shows: due vs received for each milestone. */
  async projectSummary(projectId) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw ApiError.notFound('Project not found');

    const rows = await PaymentModel.aggregate([
      { $match: { project: project._id, status: 'CLEARED' } },
      { $group: { _id: '$milestone', received: { $sum: '$amount' } } },
    ]);
    const received = Object.fromEntries(rows.map((row) => [row._id, row.received]));

    const schedule = [
      { milestone: PAYMENT_MILESTONE.TOKEN, percent: project.paymentSchedule?.tokenPercent ?? 10 },
      { milestone: PAYMENT_MILESTONE.ADVANCE, percent: project.paymentSchedule?.advancePercent ?? 60 },
      { milestone: PAYMENT_MILESTONE.BALANCE, percent: project.paymentSchedule?.balancePercent ?? 30 },
    ].map((entry) => {
      const due = round((project.contractValue * entry.percent) / 100, 2);
      const paid = round(received[entry.milestone] || 0, 2);
      return {
        ...entry,
        due,
        received: paid,
        balance: round(Math.max(0, due - paid), 2),
        cleared: isSettled(paid, due),
      };
    });

    const totalReceived = round(schedule.reduce((sum, s) => sum + s.received, 0) + (received.OTHER || 0), 2);

    return {
      contractValue: project.contractValue,
      schedule,
      totalReceived,
      totalOutstanding: round(Math.max(0, project.contractValue - totalReceived), 2),
      percentReceived: project.contractValue
        ? round((totalReceived / project.contractValue) * 100, 1)
        : 0,
    };
  }

  /** Refuses a receipt that would take a milestone past what was agreed. */
  #assertNotOverpaid(project, data) {
    if (data.milestone === 'OTHER') return;

    const percentKey = {
      [PAYMENT_MILESTONE.TOKEN]: 'tokenPercent',
      [PAYMENT_MILESTONE.ADVANCE]: 'advancePercent',
      [PAYMENT_MILESTONE.BALANCE]: 'balancePercent',
    }[data.milestone];

    const percent = project.paymentSchedule?.[percentKey] ?? 0;
    const due = round((project.contractValue * percent) / 100, 2);

    // A small tolerance absorbs rounding on the client's transfer.
    if (data.amount > due * 1.05 + 1) {
      throw ApiError.badRequest(
        `₹${data.amount.toLocaleString('en-IN')} exceeds the ${data.milestone.toLowerCase()} milestone of ₹${due.toLocaleString('en-IN')}`
      );
    }
  }

  /** Ledger entry, invoice update, and a nudge at the workflow. */
  async #postCleared(payment, project, user) {
    if (payment.invoice) {
      const invoice = await InvoiceModel.findById(payment.invoice);
      if (invoice) {
        invoice.amountPaid = round((invoice.amountPaid || 0) + payment.amount, 2);
        invoice.status = invoice.amountPaid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';
        invoice.history.push({ action: 'PAYMENT_RECEIVED', note: payment.code, by: user?.id });
        await invoice.save();
      }
    }

    await TransactionModel.create({
      code: await nextCode('TXN'),
      project: payment.project,
      direction: 'CREDIT',
      category: 'CLIENT_PAYMENT',
      amount: payment.amount,
      description: `${payment.milestone} payment received (${payment.code})`,
      payment: payment._id,
      invoice: payment.invoice,
      mode: payment.mode,
      referenceNo: payment.referenceNo,
      transactionDate: payment.receivedAt,
      recordedBy: user?.id,
    });

    // Module 19: the token clearing is what the whole project is waiting on, so
    // the DCM and the coordinator hear about it here rather than on WhatsApp.
    await notify.toProjectTeam(
      payment.project,
      {
        type: 'PAYMENT_CLEARED',
        severity: 'SUCCESS',
        title: `${payment.milestone} payment cleared — ₹${Math.round(payment.amount).toLocaleString('en-IN')}`,
        body: `${payment.code} against ${project?.code || 'the project'} has cleared.`,
        entityType: 'Payment',
        entityId: payment._id,
        link: `/projects/${payment.project}?tab=payments`,
      },
      user?.id
    );

    await projectService.tryAutoAdvance(
      payment.project,
      user,
      `${payment.milestone} payment cleared (${payment.code})`
    );

    // Clearing the token or advance often satisfies two gates at once — the
    // milestone stage and then activation — so give the machine a second pass.
    await projectService.tryAutoAdvance(payment.project, user, 'Payment gate re-checked');
  }
}

export default new PaymentService();
export { paymentRepository };

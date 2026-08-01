import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import QuotationModel from './quotation.model.js';
import BOQModel from '../../project/boq/boq.model.js';
import ProjectModel from '../../project/project/project.model.js';
import InvoiceModel from '../../accounts/invoice/invoice.model.js';
import projectService from '../../project/project/project.service.js';
import settingsService from '../../settings/settings.service.js';
import notify from '../../notification/notification.service.js';
import { round } from '../../../services/consumption.service.js';
import { APPROVAL_STATUS, PAYMENT_MILESTONE } from '../../../constants/workflow.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

const quotationRepository = new BaseRepository(QuotationModel, {
  filterable: ['project', 'client', 'status', 'isCurrent'],
  searchable: ['code'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'client', select: 'name phone' },
  ],
  defaultSort: '-revision',
});

/**
 * Step 8 — because the ERP already knows fabric, accessories, motors, stitching
 * and installation, the quotation is generated rather than typed.
 */
class QuotationService extends BaseService {
  constructor() {
    super(quotationRepository, 'Quotation');
  }

  /**
   * Step 7 — decides whether this discount needs the founder.
   *
   * The effective discount is the headline percentage *plus* whatever was shaved
   * off the individual lines, because ten per cent off the total and ten per cent
   * off every line are the same concession dressed differently — and only
   * checking the headline is exactly how a DCM would get around the rule.
   */
  #effectiveDiscountPercent(quotation) {
    const gross = (quotation.lines || []).reduce(
      (sum, line) => sum + (line.quantity || 0) * (line.rate || 0),
      0
    );
    if (gross <= 0) return quotation.discountPercent || 0;

    const afterLines = (quotation.lines || []).reduce((sum, line) => {
      const lineGross = (line.quantity || 0) * (line.rate || 0);
      return sum + lineGross * (1 - (line.discountPercent || 0) / 100);
    }, 0);

    const net = afterLines * (1 - (quotation.discountPercent || 0) / 100);
    return round(((gross - net) / gross) * 100, 2);
  }

  /**
   * Sets `discountApproval` from the current numbers.
   *
   * Re-run on every edit: dropping the discount back under the line clears a
   * pending request, and raising it again re-raises one, so the flag can never
   * disagree with the money on the document.
   */
  async #applyDiscountRule(quotation, user) {
    const threshold = await settingsService.discountThreshold();
    const settings = await settingsService.get();
    const ceiling = settings.discount?.maximumPercent ?? 100;

    const effective = this.#effectiveDiscountPercent(quotation);

    if (effective > ceiling) {
      throw ApiError.workflow(
        `A ${effective}% discount is past the company ceiling of ${ceiling}%. Nobody can approve this.`
      );
    }

    const current = quotation.discountApproval || {};

    if (effective <= threshold) {
      // Back within the DCM's own discretion — any pending request is moot.
      quotation.discountApproval = {
        ...current,
        required: false,
        status: 'NOT_REQUIRED',
        thresholdPercent: threshold,
        requestedPercent: effective,
      };
      return quotation;
    }

    // Already signed off at this exact percentage? Leave the approval standing.
    if (current.status === 'APPROVED' && current.requestedPercent === effective) {
      return quotation;
    }

    quotation.discountApproval = {
      required: true,
      status: 'PENDING',
      thresholdPercent: threshold,
      requestedPercent: effective,
      requestedBy: user?.id,
      requestedAt: new Date(),
      reason: current.reason,
    };

    return quotation;
  }

  /** Recomputes every money field from the lines. Called on create and on edit. */
  #recalculate(quotation) {
    const lines = quotation.lines.map((line) => {
      const gross = (line.quantity || 0) * (line.rate || 0);
      const discount = gross * ((line.discountPercent || 0) / 100);
      return { ...line, amount: round(gross - discount, 2) };
    });

    const subtotal = round(lines.reduce((sum, line) => sum + line.amount, 0), 2);
    const discountAmount = round((subtotal * (quotation.discountPercent || 0)) / 100, 2);
    const taxableAmount = round(subtotal - discountAmount, 2);
    const gstAmount = round((taxableAmount * (quotation.gstPercent || 0)) / 100, 2);

    return {
      lines,
      subtotal,
      discountAmount,
      taxableAmount,
      gstAmount,
      grandTotal: round(taxableAmount + gstAmount, 2),
    };
  }

  /** Builds the next revision straight off the project's current consumption sheet. */
  async generateFromBOQ(projectId, { discountPercent = 0, gstPercent, validUntil, notes, termsAndConditions } = {}, user) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw ApiError.notFound('Project not found');

    const boq = await BOQModel.findOne({ project: projectId, isCurrent: true }).lean();
    if (!boq) throw ApiError.workflow('Generate the consumption sheet before quoting');
    if (!boq.costLines?.length) {
      throw ApiError.workflow(
        'The consumption sheet has no priced lines. Set rates on the project rate card and regenerate it.'
      );
    }

    const previous = await QuotationModel.findOne({ project: projectId, isCurrent: true }).lean();
    if (previous) await QuotationModel.updateOne({ _id: previous._id }, { $set: { isCurrent: false } });

    const draft = {
      lines: boq.costLines.map((line) => ({
        key: line.key,
        particular: line.particular,
        quantity: line.quantity,
        unit: line.unit,
        rate: line.rate,
        discountPercent: 0,
        amount: line.amount,
      })),
      discountPercent,
      gstPercent: gstPercent ?? boq.gstPercent ?? 18,
    };

    const totals = this.#recalculate(draft);

    // Step 7: decide the founder question before the document exists, so a
    // quotation is never briefly sendable at a discount nobody has approved.
    const approvalDraft = { discountApproval: {}, discountPercent, lines: totals.lines };
    await this.#applyDiscountRule(approvalDraft, user);

    const quotation = await QuotationModel.create({
      code: await nextCode('QT'),
      discountApproval: approvalDraft.discountApproval,
      project: projectId,
      client: project.client,
      boq: boq._id,
      revision: (previous?.revision || 0) + 1,
      isCurrent: true,
      validUntil,
      notes,
      termsAndConditions,
      discountPercent,
      gstPercent: draft.gstPercent,
      ...totals,
      paymentTerms: {
        tokenPercent: project.paymentSchedule?.tokenPercent ?? 10,
        advancePercent: project.paymentSchedule?.advancePercent ?? 60,
        balancePercent: project.paymentSchedule?.balancePercent ?? 30,
      },
      preparedBy: user?.id,
      history: [{ action: 'GENERATED', note: `From ${boq.code}`, by: user?.id }],
    });

    await ProjectModel.updateOne({ _id: projectId }, { $set: { estimatedValue: totals.grandTotal } });
    await this.#announceDiscountRequest(quotation, user);
    await projectService.tryAutoAdvance(projectId, user, `Quotation ${quotation.code} prepared`);

    return quotation.toJSON();
  }

  /** Step 7 — puts a pending discount in front of the people who can clear it. */
  async #announceDiscountRequest(quotation, user) {
    if (quotation.discountApproval?.status !== 'PENDING') return;

    await notify.toPermission(
      PERMISSIONS.DISCOUNT_APPROVE,
      {
        type: 'DISCOUNT_APPROVAL_REQUESTED',
        severity: 'WARNING',
        title: `${quotation.discountApproval.requestedPercent}% discount needs your approval`,
        body: `Quotation ${quotation.code} discounts ${quotation.discountApproval.requestedPercent}%, past the ${quotation.discountApproval.thresholdPercent}% limit.`,
        project: quotation.project,
        entityType: 'Quotation',
        entityId: quotation._id,
        link: `/projects/${quotation.project}?tab=quotation`,
      },
      user?.id
    );
  }

  async update(id, data, user) {
    const quotation = await QuotationModel.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');

    if (quotation.status === APPROVAL_STATUS.APPROVED) {
      throw ApiError.workflow(
        'An approved quotation cannot be edited. Generate a new revision instead.'
      );
    }

    Object.assign(quotation, data);
    Object.assign(quotation, this.#recalculate(quotation));
    await this.#applyDiscountRule(quotation, user);
    quotation.history.push({ action: 'UPDATED', by: user?.id });

    await quotation.save();
    await this.#announceDiscountRequest(quotation, user);
    return quotation.toJSON();
  }

  /**
   * Step 7 — the founder's decision on a discount past the house limit.
   *
   * Guarded by `discount:approve`, which only the admin roles carry, so a DCM
   * cannot clear their own concession.
   */
  async decideDiscount(id, { approved, note } = {}, user) {
    const quotation = await QuotationModel.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');

    if (quotation.discountApproval?.status !== 'PENDING') {
      throw ApiError.workflow(
        quotation.discountApproval?.required
          ? `This discount has already been ${(quotation.discountApproval.status || '').toLowerCase()}`
          : 'This quotation does not need a discount approval'
      );
    }

    quotation.discountApproval.status = approved ? 'APPROVED' : 'REJECTED';
    quotation.discountApproval.decidedBy = user?.id;
    quotation.discountApproval.decidedAt = new Date();
    quotation.discountApproval.decisionNote = note;

    quotation.history.push({
      action: approved ? 'DISCOUNT_APPROVED' : 'DISCOUNT_REJECTED',
      note: `${quotation.discountApproval.requestedPercent}% — ${note || 'no note'}`,
      by: user?.id,
    });

    await quotation.save();

    await notify.toPermission(PERMISSIONS.CRM_MANAGE, {
      type: approved ? 'DISCOUNT_APPROVED' : 'DISCOUNT_REJECTED',
      title: `Discount ${approved ? 'approved' : 'rejected'} on ${quotation.code}`,
      body: `${quotation.discountApproval.requestedPercent}% discount — ${note || 'no note'}`,
      project: quotation.project,
      link: `/projects/${quotation.project}?tab=quotation`,
    });

    return quotation.toJSON();
  }

  /** Blocks anything client-facing while the founder still has the discount. */
  #assertDiscountCleared(quotation, action) {
    const approval = quotation.discountApproval;
    if (!approval?.required) return;

    if (approval.status === 'PENDING') {
      throw ApiError.workflow(
        `This quotation carries a ${approval.requestedPercent}% discount, past the ${approval.thresholdPercent}% limit. It needs founder approval before it can be ${action}.`
      );
    }
    if (approval.status === 'REJECTED') {
      throw ApiError.workflow(
        `The ${approval.requestedPercent}% discount was rejected${approval.decisionNote ? `: ${approval.decisionNote}` : ''}. Revise the quotation before it is ${action}.`
      );
    }
  }

  async send(id, user) {
    const quotation = await QuotationModel.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');

    this.#assertDiscountCleared(quotation, 'sent to the client');

    quotation.status = APPROVAL_STATUS.SENT;
    quotation.sentAt = new Date();
    quotation.history.push({ action: 'SENT', by: user?.id });
    await quotation.save();

    return quotation.toJSON();
  }

  /**
   * Step 9 — the client says "Done."
   *
   * Approval is the moment the quoted figure becomes the contract value, which is
   * what the 10/60/30 milestones are measured against. A proforma invoice for the
   * token is raised at the same time so accounts have something to chase.
   */
  async approve(id, { approvedByClient, contractValue } = {}, user) {
    const quotation = await QuotationModel.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');
    if (quotation.status === APPROVAL_STATUS.APPROVED) {
      throw ApiError.conflict('This quotation is already approved');
    }
    if (!quotation.isCurrent) {
      throw ApiError.workflow('Only the current revision can be approved');
    }

    this.#assertDiscountCleared(quotation, 'accepted as the contract');

    quotation.status = APPROVAL_STATUS.APPROVED;
    quotation.approvedAt = new Date();
    quotation.approvedByClient = approvedByClient;
    quotation.history.push({ action: 'APPROVED', note: approvedByClient, by: user?.id });
    await quotation.save();

    const value = contractValue ?? quotation.grandTotal;
    await ProjectModel.updateOne(
      { _id: quotation.project },
      {
        $set: {
          contractValue: value,
          approvedQuotation: quotation._id,
          'paymentSchedule.tokenPercent': quotation.paymentTerms.tokenPercent,
          'paymentSchedule.advancePercent': quotation.paymentTerms.advancePercent,
          'paymentSchedule.balancePercent': quotation.paymentTerms.balancePercent,
        },
      }
    );

    await this.#raiseTokenInvoice(quotation, value, user);

    return quotation.toJSON();
  }

  async reject(id, { reason }, user) {
    const quotation = await QuotationModel.findById(id);
    if (!quotation) throw ApiError.notFound('Quotation not found');

    quotation.status = APPROVAL_STATUS.REJECTED;
    quotation.rejectionReason = reason;
    quotation.history.push({ action: 'REJECTED', note: reason, by: user?.id });
    await quotation.save();

    return quotation.toJSON();
  }

  /** Creates the 10% token demand, unless one already exists for this project. */
  async #raiseTokenInvoice(quotation, contractValue, user) {
    const existing = await InvoiceModel.findOne({
      project: quotation.project,
      milestone: PAYMENT_MILESTONE.TOKEN,
      status: { $ne: 'CANCELLED' },
    });
    if (existing) return existing;

    const percent = quotation.paymentTerms.tokenPercent;
    const total = round((contractValue * percent) / 100, 2);

    return InvoiceModel.create({
      code: await nextCode('INV'),
      project: quotation.project,
      client: quotation.client,
      quotation: quotation._id,
      milestone: PAYMENT_MILESTONE.TOKEN,
      type: 'PROFORMA',
      lines: [
        {
          particular: `Token advance (${percent}% of contract value)`,
          quantity: 1,
          unit: 'lot',
          rate: total,
          amount: total,
        },
      ],
      // Milestone demands are a share of an already tax-inclusive contract value,
      // so GST is not applied a second time here.
      subtotal: total,
      gstPercent: 0,
      gstAmount: 0,
      total,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      raisedBy: user?.id,
    });
  }
}

export default new QuotationService();
export { quotationRepository };

import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import ApiError from '../../../core/ApiError.js';
import InvoiceModel from './invoice.model.js';
import ProjectModel from '../../project/project/project.model.js';
import { nextCode } from '../../../core/sequence.js';
import { round } from '../../../services/consumption.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PAYMENT_MILESTONE } from '../../../constants/workflow.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const invoiceSchema = z.object({
  project: objectId,
  client: objectId.optional(),
  quotation: objectId.optional(),
  milestone: z.enum([...Object.values(PAYMENT_MILESTONE), 'OTHER']).optional(),
  type: z.enum(['PROFORMA', 'TAX_INVOICE', 'CREDIT_NOTE']).optional(),
  lines: z
    .array(
      z.object({
        particular: z.string(),
        quantity: z.coerce.number().nonnegative().optional(),
        unit: z.string().optional(),
        rate: z.coerce.number().nonnegative().optional(),
      })
    )
    .optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const totalsFor = (lines = [], gstPercent = 0) => {
  const priced = lines.map((line) => ({
    ...line,
    amount: round((line.quantity ?? 1) * (line.rate || 0), 2),
  }));
  const subtotal = round(priced.reduce((sum, line) => sum + line.amount, 0), 2);
  const gstAmount = round((subtotal * gstPercent) / 100, 2);
  return { lines: priced, subtotal, gstAmount, total: round(subtotal + gstAmount, 2) };
};

class InvoiceService extends BaseService {
  async create(data, user) {
    return this.repository.create({
      ...data,
      code: await nextCode('INV'),
      ...totalsFor(data.lines, data.gstPercent ?? 0),
      raisedBy: user?.id,
    });
  }

  /**
   * Raises the demand for a milestone off the project's contract value, so
   * accounts do not have to recompute 60% of anything by hand.
   */
  async raiseMilestone(projectId, { milestone, dueDate }, user) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw ApiError.notFound('Project not found');
    if (!project.contractValue) throw ApiError.workflow('No approved quotation, so no contract value to bill');

    const existing = await InvoiceModel.findOne({
      project: projectId,
      milestone,
      status: { $ne: 'CANCELLED' },
    });
    if (existing) throw ApiError.conflict(`A ${milestone.toLowerCase()} invoice already exists (${existing.code})`);

    const percentKey = { TOKEN: 'tokenPercent', ADVANCE: 'advancePercent', BALANCE: 'balancePercent' }[milestone];
    const percent = project.paymentSchedule?.[percentKey] ?? 0;
    const amount = round((project.contractValue * percent) / 100, 2);

    return this.repository.create({
      code: await nextCode('INV'),
      project: projectId,
      client: project.client,
      quotation: project.approvedQuotation,
      milestone,
      type: 'PROFORMA',
      lines: [{ particular: `${milestone} (${percent}% of contract value)`, quantity: 1, unit: 'lot', rate: amount, amount }],
      // The contract value already includes GST, so it is not charged twice here.
      subtotal: amount,
      gstPercent: 0,
      gstAmount: 0,
      total: amount,
      status: 'ISSUED',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      raisedBy: user?.id,
    });
  }
}

const { router, service } = defineModule({
  model: InvoiceModel,
  label: 'Invoice',
  filterable: ['project', 'client', 'milestone', 'status', 'type'],
  searchable: ['code'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'client', select: 'name phone' },
  ],
  viewPermission: PERMISSIONS.ACCOUNTS_VIEW,
  managePermission: PERMISSIONS.ACCOUNTS_MANAGE,
  createSchema: invoiceSchema,
  updateSchema: invoiceSchema.partial().omit({ project: true }),
  serviceClass: InvoiceService,
  extend: (r, { canManage }) => {
    r.post(
      '/project/:projectId/milestone',
      ...canManage,
      asyncHandler(async (req, res) => {
        const data = await service.raiseMilestone(req.params.projectId, req.body || {}, req.user);
        return sendSuccess(res, `Invoice ${data.code} raised`, data, 201);
      })
    );
  },
});

export default router;

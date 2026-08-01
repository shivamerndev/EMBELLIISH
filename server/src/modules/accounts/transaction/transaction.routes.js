import { z } from 'zod';
import mongoose from 'mongoose';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import TransactionModel from './transaction.model.js';
import ProjectModel from '../../project/project/project.model.js';
import { nextCode } from '../../../core/sequence.js';
import { round } from '../../../services/consumption.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../../project/project/project.validation.js';

const transactionSchema = z.object({
  project: objectId.optional(),
  direction: z.enum(['CREDIT', 'DEBIT']),
  category: z
    .enum([
      'CLIENT_PAYMENT', 'VENDOR_PAYMENT', 'MATERIAL_PURCHASE', 'LABOUR', 'STITCHING',
      'INSTALLATION', 'TRANSPORT', 'COMMISSION', 'REFUND', 'OTHER',
    ])
    .optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  description: z.string().optional(),
  vendor: objectId.optional(),
  purchaseOrder: objectId.optional(),
  mode: z.enum(['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CARD', 'OTHER']).optional(),
  referenceNo: z.string().optional(),
  transactionDate: z.coerce.date().optional(),
});

class TransactionService extends BaseService {
  async create(data, user) {
    return this.repository.create({ ...data, code: await nextCode('TXN'), recordedBy: user?.id });
  }

  /** Money in vs money out for one project — the closest thing to a P&L. */
  async projectLedger(projectId) {
    const id = new mongoose.Types.ObjectId(String(projectId));

    const [rows, project] = await Promise.all([
      TransactionModel.aggregate([
        { $match: { project: id } },
        { $group: { _id: { direction: '$direction', category: '$category' }, total: { $sum: '$amount' } } },
      ]),
      ProjectModel.findById(projectId).select('code name contractValue').lean(),
    ]);

    const credits = rows.filter((r) => r._id.direction === 'CREDIT');
    const debits = rows.filter((r) => r._id.direction === 'DEBIT');

    const received = round(credits.reduce((sum, r) => sum + r.total, 0), 2);
    const spent = round(debits.reduce((sum, r) => sum + r.total, 0), 2);

    return {
      project,
      received,
      spent,
      margin: round(received - spent, 2),
      marginPercent: received ? round(((received - spent) / received) * 100, 1) : 0,
      creditsByCategory: credits.map((r) => ({ category: r._id.category, total: round(r.total, 2) })),
      debitsByCategory: debits.map((r) => ({ category: r._id.category, total: round(r.total, 2) })),
    };
  }
}

const { router, service } = defineModule({
  model: TransactionModel,
  label: 'Transaction',
  filterable: ['project', 'direction', 'category', 'vendor'],
  searchable: ['code', 'description', 'referenceNo'],
  populate: [{ path: 'project', select: 'name code' }],
  defaultSort: '-transactionDate',
  viewPermission: PERMISSIONS.ACCOUNTS_VIEW,
  managePermission: PERMISSIONS.ACCOUNTS_MANAGE,
  createSchema: transactionSchema,
  updateSchema: transactionSchema.partial(),
  serviceClass: TransactionService,
  extend: (r, { canView }) => {
    r.get(
      '/project/:projectId/ledger',
      ...canView,
      asyncHandler(async (req, res) =>
        sendSuccess(res, 'Project ledger retrieved', await service.projectLedger(req.params.projectId))
      )
    );
  },
});

export default router;

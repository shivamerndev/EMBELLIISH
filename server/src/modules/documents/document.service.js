import ApiError from '../../core/ApiError.js';
import pdfService from '../../services/pdf.service.js';
import settingsService from '../settings/settings.service.js';
import ProjectModel from '../project/project/project.model.js';
import ClientModel from '../crm/client/client.model.js';
import QuotationModel from '../crm/quotation/quotation.model.js';
import InvoiceModel from '../accounts/invoice/invoice.model.js';
import DesignModel from '../project/design/design.model.js';
import BOQModel from '../project/boq/boq.model.js';
import { APPROVAL_STATUS } from '../../constants/workflow.constants.js';

/**
 * Steps 6 and 7 — the paper the client actually sees.
 *
 * Gathers the record, its client and the company letterhead, and hands the whole
 * payload to the renderer. Nothing here decides layout; nothing in the renderer
 * touches the database.
 */

const companyBlock = async () => {
  const settings = await settingsService.get();
  return settings.company || {};
};

const documentService = {
  /** Step 7 — the priced quotation. */
  async quotation(quotationId) {
    const quotation = await QuotationModel.findById(quotationId).lean();
    if (!quotation) throw ApiError.notFound('Quotation not found');

    const [project, company] = await Promise.all([
      ProjectModel.findById(quotation.project).lean(),
      companyBlock(),
    ]);
    const client = quotation.client ? await ClientModel.findById(quotation.client).lean() : null;

    const buffer = await pdfService.render('quotation', { quotation, project, client, company });
    return { buffer, filename: `Quotation-${quotation.code}.pdf` };
  },

  /**
   * Step 6 — the proposal.
   *
   * Built from the current design set and the current consumption sheet, so it
   * always shows what is on the record today rather than a stale attachment
   * somebody emailed last week.
   */
  async proposal(projectId) {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw ApiError.notFound('Project not found');

    const [client, company, designs, boq] = await Promise.all([
      project.client ? ClientModel.findById(project.client).lean() : null,
      companyBlock(),
      DesignModel.find({ project: projectId, isCurrent: true }).sort('roomName').lean(),
      BOQModel.findOne({ project: projectId, isCurrent: true }).lean(),
    ]);

    if (!designs.length && !boq) {
      throw ApiError.workflow(
        'There is nothing to propose yet — record the design selections or generate the consumption sheet first'
      );
    }

    const buffer = await pdfService.render('proposal', {
      project,
      client,
      company,
      designs,
      boq,
      estimate: project.contractValue || boq?.grandTotal || project.estimatedValue || 0,
    });

    return { buffer, filename: `Proposal-${project.code}.pdf` };
  },

  /** Steps 9, 10, 18 — the milestone demand. */
  async invoice(invoiceId) {
    const invoice = await InvoiceModel.findById(invoiceId).lean();
    if (!invoice) throw ApiError.notFound('Invoice not found');

    const [project, company] = await Promise.all([
      ProjectModel.findById(invoice.project).lean(),
      companyBlock(),
    ]);
    const client = invoice.client ? await ClientModel.findById(invoice.client).lean() : null;

    const buffer = await pdfService.render('invoice', { invoice, project, client, company });
    return { buffer, filename: `${invoice.code}.pdf` };
  },

  /**
   * The proposal for a project's current quotation, chosen the way a DCM would:
   * the approved one if there is one, otherwise the latest revision.
   */
  async projectQuotation(projectId) {
    const quotation =
      (await QuotationModel.findOne({ project: projectId, status: APPROVAL_STATUS.APPROVED }).lean()) ||
      (await QuotationModel.findOne({ project: projectId, isCurrent: true }).lean());

    if (!quotation) throw ApiError.notFound('No quotation has been generated for this project yet');
    return this.quotation(quotation._id);
  },
};

export default documentService;

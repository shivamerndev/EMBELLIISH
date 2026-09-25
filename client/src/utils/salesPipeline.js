/**
 * Utility helper for managing Sales & Commercials pipeline stage transitions,
 * next step routing, and stage redirects.
 */

export const SALES_STAGES = [
  { key: 'leads', label: 'Qualified Leads', path: '/crm/sales-commercials/leads' },
  { key: 'pre-site', label: 'Pre Site Visit', path: '/crm/sales-commercials/pre-site-visit' },
  { key: 'measurement', label: 'Measurement Capture', path: '/crm/sales-commercials/measurement' },
  { key: 'studio-meeting', label: 'Studio Meeting', path: '/crm/sales-commercials/studio-meeting' },
  { key: 'consumption-boq', label: 'Consumption Sheet / BOQ', path: '/crm/sales-commercials/consumption-boq' },
  { key: 'proposal', label: 'Proposal Creation', path: '/crm/sales-commercials/proposal' },
  { key: 'token', label: 'Advance Receiving', path: '/crm/sales-commercials/advance' },
  { key: 'pricing-costing', label: 'Pricing / Material Costing', path: '/crm/sales-commercials/pricing-costing' },
  { key: 'quotation', label: 'Quotation Preparation', path: '/crm/sales-commercials/quotation' },
  { key: 'client-approval', label: 'Client Approval', path: '/crm/sales-commercials/client-approval' },
  { key: 'kyc', label: 'KYC / Customer Conversion', path: '/crm/sales-commercials/kyc' },
  { key: 'ready-size', label: 'Site Detail Sheet', path: '/crm/sales-commercials/ready-size' },
];

export const getNextStage = (currentStageKey) => {
  if (!currentStageKey) return SALES_STAGES[1];

  const key = String(currentStageKey).toLowerCase();

  let index = -1;
  if (key === 'leads' || key === 'lead') index = 0;
  else if (key.includes('pre-site') || key.includes('presite')) index = 1;
  else if (key.includes('measurement') || key.includes('measure')) index = 2;
  else if (key.includes('studio')) index = 3;
  else if (key.includes('consumption') || key.includes('boq')) index = 4;
  else if (key.includes('proposal')) index = 5;
  else if (key.includes('token') || key.includes('budget') || key.includes('advance')) index = 6;
  else if (key.includes('pricing') || key.includes('costing')) index = 7;
  else if (key.includes('quotation')) index = 8;
  else if (key.includes('approval')) index = 9;
  else if (key.includes('kyc')) index = 10;
  else if (key.includes('ready') || key.includes('site-detail') || key.includes('detail-sheet')) index = 11;

  if (index >= 0 && index < SALES_STAGES.length - 1) {
    return SALES_STAGES[index + 1];
  }
  return SALES_STAGES[SALES_STAGES.length - 1];
};

export const getNextStageUrl = (currentStageKey, leadCode = '') => {
  const next = getNextStage(currentStageKey);
  const search = leadCode ? `?search=${encodeURIComponent(leadCode)}` : '';
  return {
    nextStage: next,
    url: `${next.path}${search}`
  };
};

/**
 * Calculate pricing totals from quotation fields (subtotal, discount, taxes, finalQuotedValue).
 */
export const calculateQuotationTotals = (q = {}) => {
  const cataloguePrice = Number(q.cataloguePrice || 0);
  const labourPrice = Number(q.labourPrice || 0);
  const samplePrice = Number(q.samplePrice || 0);
  const subtotal = cataloguePrice + labourPrice + samplePrice;

  const discountPercent = Number(q.discount || 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxRate = Number(q.taxes ?? 18);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const finalQuotedValue = taxableAmount + taxAmount;

  return {
    subtotal,
    discountPercent,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    finalQuotedValue,
  };
};

/**
 * Validates whether a lead has an actual quotation created in the database.
 * Pure due dates, default approval status (e.g. PENDING), or empty drafts do NOT count.
 */
export const isQuotationCreatedInDb = (lead) => {
  if (!lead) return false;
  const q = lead.quotation || lead.salesCommercial?.quotation;
  const approval = lead.approval || lead.salesCommercial?.approval;
  if (!q && !approval) return false;

  // 1. Explicit Quotation Sheet created (from Quotation Preparation modal / sheet builder)
  if (q?.quotationSheet) {
    if (typeof q.quotationSheet === 'object' && q.quotationSheet !== null) {
      const sheet = q.quotationSheet;
      if (
        (Array.isArray(sheet.rooms) && sheet.rooms.length > 0) ||
        (Array.isArray(sheet.services) && sheet.services.length > 0) ||
        (sheet.totals && (Number(sheet.totals.grandTotal || 0) > 0 || Number(sheet.totals.grandTotalValue || 0) > 0 || Number(sheet.totals.roundOff || 0) > 0)) ||
        sheet.updatedAt ||
        sheet.coverLetter?.quotationNo ||
        Object.keys(sheet).length > 2
      ) {
        return true;
      }
    } else if (typeof q.quotationSheet === 'string' && q.quotationSheet.trim() && q.quotationSheet.trim() !== '{}' && q.quotationSheet.trim() !== '[]') {
      return true;
    }
  }

  // 2. Quotation Number generated/saved (not placeholder or empty)
  const quotNo = q?.no || lead.quotationNo;
  if (quotNo && typeof quotNo === 'string' && quotNo.trim() && quotNo.trim().toLowerCase() !== 'pending gen') {
    return true;
  }

  // 3. Final Quoted Value entered / calculated (> 0)
  if (q?.finalQuotedValue !== undefined && q?.finalQuotedValue !== null && q?.finalQuotedValue !== '') {
    const val = Number(q.finalQuotedValue);
    if (!isNaN(val) && val > 0) return true;
  }

  // 4. Quotation Date officially issued/set
  if (q?.date && String(q.date).trim()) {
    return true;
  }

  // 5. Items Table with rooms or services configured
  if (q?.itemsTable && typeof q.itemsTable === 'object' && q.itemsTable !== null) {
    if (
      (Array.isArray(q.itemsTable.rooms) && q.itemsTable.rooms.length > 0) ||
      (Array.isArray(q.itemsTable.services) && q.itemsTable.services.length > 0)
    ) {
      return true;
    }
  }

  // 6. Cover Letter created with quotation info
  if (q?.coverLetter && typeof q.coverLetter === 'object' && q.coverLetter !== null) {
    if (q.coverLetter.quotationNo || q.coverLetter.subject || q.coverLetter.scopeTitle) {
      return true;
    }
  }

  // 7. Pricing lines entered in quotation (catalogue, labour, sample price > 0)
  if ((Number(q?.cataloguePrice) || 0) > 0 || (Number(q?.labourPrice) || 0) > 0 || (Number(q?.samplePrice) || 0) > 0) {
    return true;
  }

  // 8. BOQ attached to quotation (array with items)
  if (Array.isArray(q?.boq) && q.boq.length > 0) {
    return true;
  }

  // 9. Quotation Status indicates generated/issued/approved/sent
  if (q?.status && ['Approved', 'Completed', 'Sent', 'Issued', 'Generated'].some((s) => s.toLowerCase() === String(q.status).trim().toLowerCase())) {
    return true;
  }

  // 10. Discount Approval status explicitly processed (e.g. APPROVED or REJECTED)
  if (q?.discountApprovalStatus && ['APPROVED', 'REJECTED'].includes(String(q.discountApprovalStatus).toUpperCase())) {
    return true;
  }

  // 11. Final Approved Version or revisions logged in client approval stage
  if (approval?.finalApprovedVersion && String(approval.finalApprovedVersion).trim()) {
    return true;
  }
  if (Array.isArray(approval?.revisions) && approval.revisions.length > 0) {
    return true;
  }

  return false;
};



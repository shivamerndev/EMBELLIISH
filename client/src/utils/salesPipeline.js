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
  { key: 'ready-size', label: 'Ready Size Confirmation', path: '/crm/sales-commercials/ready-size' },
  { key: 'proposal', label: 'Proposal Creation', path: '/crm/sales-commercials/proposal' },
  { key: 'token', label: 'Budgeting / Token Discussion', path: '/crm/sales-commercials/token-discussion' },
  { key: 'pricing-costing', label: 'Pricing / Material Costing', path: '/crm/sales-commercials/pricing-costing' },
  { key: 'quotation', label: 'Quotation Preparation', path: '/crm/sales-commercials/quotation' },
  { key: 'client-approval', label: 'Client Approval', path: '/crm/sales-commercials/client-approval' },
  { key: 'kyc', label: 'KYC / Customer Conversion', path: '/crm/sales-commercials/kyc' },
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
  else if (key.includes('ready')) index = 5;
  else if (key.includes('proposal')) index = 6;
  else if (key.includes('token') || key.includes('budget')) index = 7;
  else if (key.includes('pricing') || key.includes('costing')) index = 8;
  else if (key.includes('quotation')) index = 9;
  else if (key.includes('approval')) index = 10;
  else if (key.includes('kyc')) index = 11;

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

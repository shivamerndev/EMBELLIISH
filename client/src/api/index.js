import api from './axios';

/**
 * One place that knows every endpoint. Grouped the way the business is grouped,
 * so a page reads like the step of the workflow it belongs to.
 */

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  profile: () => api.get('/auth/profile'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
};

export const metaApi = {
  get: () => api.get('/meta'),
};

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  byRole: (role) => api.get(`/users/by-role/${role}`),
  create: (payload) => api.post('/users', payload),
};

export const membersApi = {
  summary: () => api.get('/members/summary'),
  list: (params) => api.get('/members', { params }),
  get: (id) => api.get(`/members/${id}`),
  create: (payload) => api.post('/members', payload),
  update: (id, payload) => api.put(`/members/${id}`, payload),
  remove: (id) => api.delete(`/members/${id}`),
};

/* ------------------------------------------------------------------ CRM */

export const leadsApi = {
  list: (params) => api.get('/crm/leads', { params }),
  get: (id) => api.get(`/crm/leads/${id}`),
  create: (payload) => api.post('/crm/leads', payload),
  update: (id, payload) => api.put(`/crm/leads/${id}`, payload),
  remove: (id) => api.delete(`/crm/leads/${id}`),
  delete: (id) => api.delete(`/crm/leads/${id}`),
  pipeline: () => api.get('/crm/leads/pipeline'),
  qualify: (id, payload) => api.post(`/crm/leads/${id}/qualify`, payload),
  assign: (id, payload) => api.post(`/crm/leads/${id}/assign`, payload),
  convert: (id, payload) => api.post(`/crm/leads/${id}/convert`, payload),
  markLost: (id, payload) => api.post(`/crm/leads/${id}/lost`, payload),
  addFollowUp: (id, payload) => api.post(`/crm/leads/${id}/followups`, payload),
};

export const clientsApi = {
  list: (params) => api.get('/crm/clients', { params }),
  get: (id) => api.get(`/crm/clients/${id}`),
  projects: (id) => api.get(`/crm/clients/${id}/projects`),
  create: (payload) => api.post('/crm/clients', payload),
  update: (id, payload) => api.put(`/crm/clients/${id}`, payload),
};

export const architectsApi = {
  list: (params) => api.get('/crm/architects', { params }),
  create: (payload) => api.post('/crm/architects', payload),
  update: (id, payload) => api.put(`/crm/architects/${id}`, payload),
};

export const followupsApi = {
  list: (params) => api.get('/crm/followups', { params }),
  due: (mine) => api.get('/crm/followups/due', { params: { mine } }),
  create: (payload) => api.post('/crm/followups', payload),
  complete: (id, payload) => api.post(`/crm/followups/${id}/complete`, payload),
};

export const quotationsApi = {
  list: (params) => api.get('/crm/quotations', { params }),
  get: (id) => api.get(`/crm/quotations/${id}`),
  create: (payload) => api.post('/crm/quotations', payload),
  generate: (projectId, payload) => api.post(`/crm/quotations/project/${projectId}/generate`, payload),
  update: (id, payload) => api.put(`/crm/quotations/${id}`, payload),
  send: (id) => api.post(`/crm/quotations/${id}/send`),
  approve: (id, payload) => api.post(`/crm/quotations/${id}/approve`, payload),
  reject: (id, payload) => api.post(`/crm/quotations/${id}/reject`, payload),
  /** Step 7 — the founder's call on a discount past the house limit. */
  approveDiscount: (id, payload) => api.post(`/crm/quotations/${id}/discount/approve`, payload),
  rejectDiscount: (id, payload) => api.post(`/crm/quotations/${id}/discount/reject`, payload),
};

/* -------------------------------------------------------------- Project */

export const projectsApi = {
  list: (params) => api.get('/project/projects', { params }),
  get: (id) => api.get(`/project/projects/${id}`),
  workspace: (id) => api.get(`/project/projects/${id}/workspace`),
  stageStatus: (id) => api.get(`/project/projects/${id}/stage-status`),
  create: (payload) => api.post('/project/projects', payload),
  update: (id, payload) => api.put(`/project/projects/${id}`, payload),
  advance: (id, payload) => api.post(`/project/projects/${id}/advance`, payload),
  hold: (id, payload) => api.post(`/project/projects/${id}/hold`, payload),
  assign: (id, payload) => api.post(`/project/projects/${id}/assign`, payload),
  close: (id, payload) => api.post(`/project/projects/${id}/close`, payload),
};

export const roomsApi = {
  byProject: (projectId) => api.get(`/project/rooms/project/${projectId}`),
  create: (payload) => api.post('/project/rooms', payload),
  bulk: (payload) => api.post('/project/rooms/bulk', payload),
  update: (id, payload) => api.put(`/project/rooms/${id}`, payload),
  remove: (id) => api.delete(`/project/rooms/${id}`),
};

export const measurementsApi = {
  byProject: (projectId) => api.get(`/project/measurements/project/${projectId}`),
  calculate: (payload) => api.post('/project/measurements/calculate', payload),
  create: (payload) => api.post('/project/measurements', payload),
  update: (id, payload) => api.put(`/project/measurements/${id}`, payload),
  remove: (id) => api.delete(`/project/measurements/${id}`),

  /** Step 4 — window size against finished size, and the sign-off that gates stitching. */
  readySize: (projectId) => api.get(`/project/measurements/project/${projectId}/ready-size`),
  setReadySize: (id, payload) => api.post(`/project/measurements/${id}/ready-size`, payload),
  confirmAllReadySizes: (projectId, payload) =>
    api.post(`/project/measurements/project/${projectId}/ready-size/confirm-all`, payload),
};

export const uploadApi = {
  upload: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const siteVisitsApi = {
  list: (params) => api.get('/project/site-visits', { params }),
  create: (payload) => api.post('/project/site-visits', payload),
  complete: (id, payload) => api.post(`/project/site-visits/${id}/complete`, payload),
  addMedia: (id, payload) => api.post(`/project/site-visits/${id}/media`, payload),
  deleteMedia: (id, payload) => api.delete(`/project/site-visits/${id}/media`, { data: payload }),
};

export const boqApi = {
  current: (projectId) => api.get(`/project/boqs/project/${projectId}/current`),
  preview: (projectId, payload) => api.post(`/project/boqs/project/${projectId}/preview`, payload),
  generate: (projectId, payload) => api.post(`/project/boqs/project/${projectId}/generate`, payload),
  list: (params) => api.get('/project/boqs', { params }),
  approve: (id) => api.post(`/project/boqs/${id}/approve`),
};

export const designsApi = {
  list: (params) => api.get('/project/designs', { params }),
  create: (payload) => api.post('/project/designs', payload),
  present: (id) => api.post(`/project/designs/${id}/present`),
  approve: (id, payload) => api.post(`/project/designs/${id}/approve`, payload),
  revise: (id, payload) => api.post(`/project/designs/${id}/revise`, payload),
};

export const drawingsApi = {
  list: (params) => api.get('/project/drawings', { params }),
  create: (payload) => api.post('/project/drawings', payload),
  approve: (id) => api.post(`/project/drawings/${id}/approve`),
};

export const installationsApi = {
  list: (params) => api.get('/project/installations', { params }),
  summary: (projectId) => api.get(`/project/installations/project/${projectId}/summary`),
  create: (payload) => api.post('/project/installations', payload),
  start: (id) => api.post(`/project/installations/${id}/start`),
  complete: (id, payload) => api.post(`/project/installations/${id}/complete`, payload),
};

export const snagsApi = {
  list: (params) => api.get('/project/snags', { params }),
  summary: (projectId) => api.get(`/project/snags/project/${projectId}/summary`),
  create: (payload) => api.post('/project/snags', payload),
  ready: (id, payload) => api.post(`/project/snags/${id}/ready`, payload),
  close: (id, payload) => api.post(`/project/snags/${id}/close`, payload),
  addMedia: (id, payload) => api.post(`/project/snags/${id}/media`, payload),
  deleteMedia: (id, payload) => api.delete(`/project/snags/${id}/media`, { data: payload }),
};

/* ------------------------------------------------------------ Inventory */

export const fabricsApi = {
  list: (params) => api.get('/inventory/fabrics', { params }),
  create: (payload) => api.post('/inventory/fabrics', payload),
  update: (id, payload) => api.put(`/inventory/fabrics/${id}`, payload),
};

export const motorsApi = {
  list: (params) => api.get('/inventory/motors', { params }),
  create: (payload) => api.post('/inventory/motors', payload),
};

export const accessoriesApi = {
  list: (params) => api.get('/inventory/accessories', { params }),
  create: (payload) => api.post('/inventory/accessories', payload),
};

export const vendorsApi = {
  list: (params) => api.get('/inventory/vendors', { params }),
  create: (payload) => api.post('/inventory/vendors', payload),
};

export const stockApi = {
  list: (params) => api.get('/inventory/stocks', { params }),
  lowStock: () => api.get('/inventory/stocks/low-stock'),
  movements: (params) => api.get('/inventory/stocks/movements', { params }),
  availability: (projectId) => api.get(`/inventory/stocks/project/${projectId}/availability`),
  reserveForProject: (projectId) => api.post(`/inventory/stocks/project/${projectId}/reserve`),
  receive: (payload) => api.post('/inventory/stocks/receive', payload),
  adjust: (payload) => api.post('/inventory/stocks/adjust', payload),
};

export const purchaseApi = {
  list: (params) => api.get('/inventory/purchase-orders', { params }),
  get: (id) => api.get(`/inventory/purchase-orders/${id}`),
  generate: (projectId, payload) => api.post(`/inventory/purchase-orders/project/${projectId}/generate`, payload),
  issue: (id) => api.post(`/inventory/purchase-orders/${id}/issue`),
  receive: (id, payload) => api.post(`/inventory/purchase-orders/${id}/receive`, payload),
  create: (payload) => api.post('/inventory/purchase-orders', payload),
};

/* ----------------------------------------------------------- Production */

export const productionApi = {
  list: (params) => api.get('/production/orders', { params }),
  board: (projectId) => api.get(`/production/orders/project/${projectId}/board`),
  generate: (projectId, payload) => api.post(`/production/orders/project/${projectId}/generate`, payload),
  advance: (id, payload) => api.post(`/production/orders/${id}/advance`, payload),
  bulkAdvance: (payload) => api.post('/production/orders/bulk-advance', payload),
};

export const qcApi = {
  list: (params) => api.get('/production/qc', { params }),
  summary: (projectId) => api.get(`/production/qc/project/${projectId}/summary`),
  inspect: (productionOrderId, payload) =>
    api.post(`/production/qc/production-order/${productionOrderId}/inspect`, payload),
};

export const packingApi = {
  list: (params) => api.get('/production/packing', { params }),
  packingList: (projectId) => api.get(`/production/packing/project/${projectId}/list`),
  pack: (projectId) => api.post(`/production/packing/project/${projectId}/pack`),
};

export const dispatchApi = {
  list: (params) => api.get('/production/dispatches', { params }),
  create: (payload) => api.post('/production/dispatches', payload),
  deliver: (id, payload) => api.post(`/production/dispatches/${id}/deliver`, payload),
};

/* ------------------------------------------------------------- Accounts */

export const invoicesApi = {
  list: (params) => api.get('/accounts/invoices', { params }),
  create: (payload) => api.post('/accounts/invoices', payload),
  raiseMilestone: (projectId, payload) => api.post(`/accounts/invoices/project/${projectId}/milestone`, payload),
};

export const paymentsApi = {
  list: (params) => api.get('/accounts/payments', { params }),
  summary: (projectId) => api.get(`/accounts/payments/project/${projectId}/summary`),
  create: (payload) => api.post('/accounts/payments', payload),
  clear: (id, payload) => api.post(`/accounts/payments/${id}/clear`, payload),
  bounce: (id, payload) => api.post(`/accounts/payments/${id}/bounce`, payload),
};

export const transactionsApi = {
  list: (params) => api.get('/accounts/transactions', { params }),
  ledger: (projectId) => api.get(`/accounts/transactions/project/${projectId}/ledger`),
  create: (payload) => api.post('/accounts/transactions', payload),
};

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  salesPerformance: () => api.get('/reports/sales-performance'),
  analytics: () => api.get('/reports/analytics'),
  project: (projectId) => api.get(`/reports/project/${projectId}`),
  material: (projectId) => api.get(`/reports/project/${projectId}/material`),
};

export const salesApi = {
  fetchApprovedLeads: () => api.get('/sales/leads'),
};

/* --------------------------------------------------------- Notifications */

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

/* ---------------------------------------------------- Settings & pricing */

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (payload) => api.put('/settings', payload),
};

export const pricingApi = {
  list: (params) => api.get('/pricing', { params }),
  current: (on) => api.get('/pricing/current', { params: { on } }),
  coverage: () => api.get('/pricing/coverage'),
  rateCard: (on) => api.get('/pricing/rate-card', { params: { on } }),
  create: (payload) => api.post('/pricing', payload),
  update: (id, payload) => api.put(`/pricing/${id}`, payload),
  retire: (id) => api.post(`/pricing/${id}/retire`),
};

/* ------------------------------------------------------------- Documents */

/**
 * Steps 6 and 7 — the client-facing PDFs.
 *
 * These answer with bytes rather than the usual envelope, and the routes need the
 * bearer token, so a plain `window.open` on the URL would come back 401. Instead
 * the file is fetched through axios and handed to the browser as a blob.
 */
const openPdf = async (path) => {
  const blob = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  // Revoking straight away would race the new tab opening it; a minute is ample.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const documentsApi = {
  proposal: (projectId) => openPdf(`/documents/project/${projectId}/proposal`),
  quotation: (quotationId) => openPdf(`/documents/quotation/${quotationId}`),
  projectQuotation: (projectId) => openPdf(`/documents/project/${projectId}/quotation`),
  invoice: (invoiceId) => openPdf(`/documents/invoice/${invoiceId}`),
};

export { default as api } from './axios';

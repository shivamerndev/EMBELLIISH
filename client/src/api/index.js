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

export const architectsApi = {
  list: (params) => api.get('/crm/architects', { params }),
  create: (payload) => api.post('/crm/architects', payload),
  update: (id, payload) => api.put(`/crm/architects/${id}`, payload),
};

/* ------------------------------------------------------------ Inventory */

export const fabricsApi = {
  list: (params) => api.get('/inventory/fabrics', { params }),
  create: (payload) => api.post('/inventory/fabrics', payload),
  update: (id, payload) => api.put(`/inventory/fabrics/${id}`, payload),
};

/* ---------------------------------------------------- Upload */

export const uploadApi = {
  upload: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

/* -------------------------------------------------------------- Reports */

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
};

/* --------------------------------------------------------------- Sales */

export const salesApi = {
  fetchApprovedLeads: () => api.get('/sales/leads'),
};

export { default as api } from './axios';

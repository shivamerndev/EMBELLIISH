import api from './axios';

const PMS_STAGES = [
  { key: 'projectActivation', slug: 'project-activation', label: 'Project Activation / Advance' },
  { key: 'executionSetup', slug: 'execution-setup', label: 'Execution Setup / Project Context' },
  { key: 'designFinalisation', slug: 'design-finalisation', label: 'Design Finalisation' },
  { key: 'executionDrawingRequest', slug: 'execution-drawing-request', label: 'Execution Drawing Request Raise' },
  { key: 'executionDrawingPreparation', slug: 'execution-drawing-preparation', label: 'Execution Drawing Preparation' },
  { key: 'approvals', slug: 'approvals', label: 'Approvals' },
  { key: 'changeRevisionControl', slug: 'change-revision-control', label: 'Change / Revision Control' },
  { key: 'orderSheetFmsCreation', slug: 'order-sheet-fms-creation', label: 'Order Sheet / FMS Creation' },
  { key: 'procurementRequest', slug: 'procurement-request', label: 'Procurement Request' },
  { key: 'motorsAccessoriesControl', slug: 'motors-accessories-control', label: 'Motors / Accessories Control' },
  { key: 'qcStatus', slug: 'qc-status', label: 'Production / QC Status' },
  { key: 'packingDispatchReadiness', slug: 'packing-dispatch-readiness', label: 'Packing / Dispatch Readiness' },
  { key: 'installation', slug: 'installation', label: 'Installation' },
  { key: 'finalPayment', slug: 'final-payment', label: 'Final Payment' },
  { key: 'installationScheduling', slug: 'installation-scheduling', label: 'Installation Scheduling' },
  { key: 'installationBriefDispatch', slug: 'installation-brief-dispatch', label: 'Installation Brief / Dispatch to Site' },
  { key: 'installationExecutionUpdates', slug: 'installation-execution-updates', label: 'Installation Execution / Daily Updates' },
  { key: 'clientExecutionUpdates', slug: 'client-execution-updates', label: 'Client Execution Updates' },
  { key: 'snagRework', slug: 'snag-rework', label: 'Snag / Rework' },
  { key: 'maintenance', slug: 'maintenance', label: 'Maintenance' },
  { key: 'projectClosure', slug: 'project-closure', label: 'Project Closure' },
];

const buildStageApi = (slug) => ({
  list: (params) => api.get(`/pms/${slug}`, { params }),
  get: (id) => api.get(`/pms/${slug}/${id}`),
  create: (payload) => api.post(`/pms/${slug}`, payload),
  update: (id, payload) => api.put(`/pms/${slug}/${id}`, payload),
  remove: (id) => api.delete(`/pms/${slug}/${id}`),
});

export const pmsApi = Object.fromEntries(
  PMS_STAGES.map((stage) => [stage.key, buildStageApi(stage.slug)])
);

export { PMS_STAGES };
export default pmsApi;

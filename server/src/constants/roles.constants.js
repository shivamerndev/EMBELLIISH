/**
 * Roles mirror the people in the Embellish story: Hitesh runs the desk, a Senior
 * DCM qualifies leads, Rahul (DCM) owns the project, a Project Coordinator enters
 * measurements, and the factory / stores / accounts / install teams pick it up.
 */
const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SENIOR_DCM: 'SENIOR_DCM',
  DCM: 'DCM',
  PROJECT_COORDINATOR: 'PROJECT_COORDINATOR',
  DESIGNER: 'DESIGNER',
  EXECUTION_ENGINEER: 'EXECUTION_ENGINEER',
  PURCHASE_MANAGER: 'PURCHASE_MANAGER',
  STORE_KEEPER: 'STORE_KEEPER',
  FACTORY_MANAGER: 'FACTORY_MANAGER',
  QC_INSPECTOR: 'QC_INSPECTOR',
  INSTALLER: 'INSTALLER',
  ACCOUNTANT: 'ACCOUNTANT',
  ARCHITECT: 'ARCHITECT',
  MANAGER: 'MANAGER',
};

const PERMISSIONS = {
  CRM_VIEW: 'crm:view',
  CRM_MANAGE: 'crm:manage',
  PROJECT_VIEW: 'project:view',
  PROJECT_MANAGE: 'project:manage',
  MEASUREMENT_MANAGE: 'measurement:manage',
  BOQ_VIEW: 'boq:view',
  BOQ_MANAGE: 'boq:manage',
  DESIGN_MANAGE: 'design:manage',
  DRAWING_MANAGE: 'drawing:manage',
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',
  PURCHASE_MANAGE: 'purchase:manage',
  PRODUCTION_VIEW: 'production:view',
  PRODUCTION_MANAGE: 'production:manage',
  QC_MANAGE: 'qc:manage',
  INSTALL_VIEW: 'install:view',
  INSTALL_MANAGE: 'install:manage',
  ACCOUNTS_VIEW: 'accounts:view',
  ACCOUNTS_MANAGE: 'accounts:manage',
  REPORTS_VIEW: 'reports:view',
  USER_MANAGE: 'user:manage',
  /** Step 7 — sign off a discount past the house limit. The founder's call. */
  DISCOUNT_APPROVE: 'discount:approve',
  /** Module 7 — the pricing master everyone else quotes from. */
  PRICING_MANAGE: 'pricing:manage',
  /** Module 20 — company details, thresholds, calculation defaults. */
  SETTINGS_MANAGE: 'settings:manage',
};

const P = PERMISSIONS;

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/**
 * "Each department sees only the tasks relevant to them, while management gets a
 * complete end-to-end view." Reads are generous, writes stay narrow.
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ADMIN]: ALL_PERMISSIONS,

  [ROLES.SENIOR_DCM]: [
    P.CRM_VIEW, P.CRM_MANAGE, P.PROJECT_VIEW, P.PROJECT_MANAGE,
    P.BOQ_VIEW, P.BOQ_MANAGE, P.DESIGN_MANAGE,
    P.INVENTORY_VIEW, P.PRODUCTION_VIEW, P.INSTALL_VIEW,
    P.ACCOUNTS_VIEW, P.REPORTS_VIEW,
  ],

  [ROLES.DCM]: [
    P.CRM_VIEW, P.CRM_MANAGE, P.PROJECT_VIEW, P.PROJECT_MANAGE,
    P.BOQ_VIEW, P.DESIGN_MANAGE, P.INVENTORY_VIEW,
    P.PRODUCTION_VIEW, P.INSTALL_VIEW, P.ACCOUNTS_VIEW, P.REPORTS_VIEW,
  ],

  [ROLES.PROJECT_COORDINATOR]: [
    P.CRM_VIEW, P.PROJECT_VIEW, P.PROJECT_MANAGE, P.MEASUREMENT_MANAGE,
    P.BOQ_VIEW, P.BOQ_MANAGE, P.DRAWING_MANAGE,
    P.INVENTORY_VIEW, P.PRODUCTION_VIEW, P.INSTALL_VIEW, P.REPORTS_VIEW,
  ],

  [ROLES.DESIGNER]: [P.PROJECT_VIEW, P.BOQ_VIEW, P.DESIGN_MANAGE, P.INVENTORY_VIEW],

  [ROLES.EXECUTION_ENGINEER]: [
    P.PROJECT_VIEW, P.BOQ_VIEW, P.DRAWING_MANAGE, P.MEASUREMENT_MANAGE,
    P.PRODUCTION_VIEW, P.INSTALL_VIEW,
  ],

  [ROLES.PURCHASE_MANAGER]: [
    P.PROJECT_VIEW, P.BOQ_VIEW, P.INVENTORY_VIEW, P.INVENTORY_MANAGE,
    P.PURCHASE_MANAGE, P.PRODUCTION_VIEW, P.REPORTS_VIEW,
  ],

  [ROLES.STORE_KEEPER]: [P.PROJECT_VIEW, P.INVENTORY_VIEW, P.INVENTORY_MANAGE, P.PRODUCTION_VIEW],

  [ROLES.FACTORY_MANAGER]: [
    P.PROJECT_VIEW, P.BOQ_VIEW, P.INVENTORY_VIEW,
    P.PRODUCTION_VIEW, P.PRODUCTION_MANAGE, P.QC_MANAGE, P.REPORTS_VIEW,
  ],

  [ROLES.QC_INSPECTOR]: [P.PROJECT_VIEW, P.PRODUCTION_VIEW, P.QC_MANAGE],

  [ROLES.INSTALLER]: [P.PROJECT_VIEW, P.INSTALL_VIEW, P.INSTALL_MANAGE, P.PRODUCTION_VIEW],

  [ROLES.ACCOUNTANT]: [
    P.CRM_VIEW, P.PROJECT_VIEW, P.BOQ_VIEW,
    P.ACCOUNTS_VIEW, P.ACCOUNTS_MANAGE, P.REPORTS_VIEW,
  ],

  [ROLES.ARCHITECT]: [P.CRM_VIEW, P.PROJECT_VIEW],

  [ROLES.MANAGER]: [
    P.CRM_VIEW, P.CRM_MANAGE, P.PROJECT_VIEW, P.PROJECT_MANAGE,
    P.BOQ_VIEW, P.BOQ_MANAGE, P.REPORTS_VIEW,
  ],
};

const permissionsForRole = (role) => ROLE_PERMISSIONS[role] || [];

export { ROLES, PERMISSIONS, ROLE_PERMISSIONS, ALL_PERMISSIONS, permissionsForRole };

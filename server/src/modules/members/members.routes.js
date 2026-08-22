import express from 'express';
import { z } from 'zod';
import asyncHandler from '../../core/asyncHandler.js';
import ApiError from '../../core/ApiError.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import UserModel from '../user/user.model.js';
import ArchitectModel from '../crm/architect/architect.model.js';
import ProjectModel from '../project/project/project.model.js';
import LeadModel from '../crm/lead/lead.model.js';
import { ROLES } from '../../constants/roles.constants.js';

const router = express.Router();

// Phone validation pattern matching ERP standards
const phoneRegex = /^(\+\d{1,4}[- ]?)?\d{7,15}$/;

const createMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z
    .string()
    .min(3, 'Contact number is required')
    .refine((val) => phoneRegex.test(val.trim().replace(/\s+/g, ' ')), {
      message: 'Enter a valid contact number (7-15 digits)',
    }),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.string().min(1, 'Role is required'),
  department: z.string().optional(),
});

/**
 * Format system role string to human-readable format
 */
const formatRoleLabel = (role) => {
  if (!role) return 'Member';
  switch (role.toUpperCase()) {
    case 'SENIOR_DCM':
      return 'Senior DCM';
    case 'DCM':
      return 'DCM';
    case 'MANAGER':
      return 'Manager';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'Manager';
    case 'ARCHITECT':
      return 'Architect';
    case 'PROJECT_COORDINATOR':
      return 'Project Coordinator';
    case 'DESIGNER':
      return 'Designer';
    case 'EXECUTION_ENGINEER':
      return 'Execution Engineer';
    case 'PURCHASE_MANAGER':
      return 'Purchase Manager';
    case 'FACTORY_MANAGER':
      return 'Factory Manager';
    case 'INSTALLER':
      return 'Installer';
    case 'ACCOUNTANT':
      return 'Accountant';
    default:
      return role.replace(/_/g, ' ');
  }
};

/**
 * Map custom UI role selections to DB role enum
 */
const mapToDbRole = (roleInput) => {
  const normalized = String(roleInput || '').toUpperCase().trim();
  if (normalized === 'DCM') return ROLES.DCM;
  if (normalized === 'SENIOR_DCM' || normalized === 'SENIOR DCM') return ROLES.SENIOR_DCM;
  if (normalized === 'MANAGER' || normalized === 'DCM MANAGER') return ROLES.MANAGER;
  if (normalized === 'ARCHITECT') return ROLES.ARCHITECT;
  if (Object.values(ROLES).includes(normalized)) return normalized;
  return ROLES.DCM;
};

/**
 * Calculate workload level based on project count
 */
const calculateWorkload = (projectCount) => {
  if (projectCount <= 2) return 'Low';
  if (projectCount <= 5) return 'Medium';
  return 'High';
};

/**
 * GET /api/v1/members/summary
 * Dynamic summary statistics from the database
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const users = await UserModel.find({ isActive: true }).select('role').lean();
    const architectsCount = await ArchitectModel.countDocuments({ isActive: true });
    const totalProjects = await ProjectModel.countDocuments();

    let totalDcms = 0;
    let totalManagers = 0;
    let totalArchitects = 0;

    for (const u of users) {
      const r = (u.role || '').toUpperCase();
      if (r === ROLES.DCM || r === ROLES.SENIOR_DCM || r.includes('DCM')) {
        totalDcms += 1;
      } else if (
        r === ROLES.MANAGER ||
        r === ROLES.ADMIN ||
        r === ROLES.SUPER_ADMIN ||
        r === ROLES.PURCHASE_MANAGER ||
        r === ROLES.FACTORY_MANAGER ||
        r.includes('MANAGER') ||
        r.includes('ADMIN')
      ) {
        totalManagers += 1;
      } else if (r === ROLES.ARCHITECT || r.includes('ARCHITECT')) {
        totalArchitects += 1;
      }
    }

    // Include stand-alone architects if not already counted as users
    const userArchitectCount = users.filter(
      (u) => (u.role || '').toUpperCase() === ROLES.ARCHITECT
    ).length;
    if (architectsCount > userArchitectCount) {
      totalArchitects += architectsCount - userArchitectCount;
    }

    return sendSuccess(res, 'Members summary retrieved', {
      totalDcms,
      totalManagers,
      totalArchitects,
      totalProjects,
    });
  })
);

/**
 * GET /api/v1/members
 * Fetch all members with dynamically computed project count & workload
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    const projects = await ProjectModel.find()
      .select('assignedDCM projectCoordinator designer executionEngineer installer architect code name')
      .lean();
    const leads = await LeadModel.find()
      .select('assignedDCM assignedDcmName architect architectName')
      .lean();

    const membersList = users.map((user) => {
      const userIdStr = user._id.toString();
      const userNameLower = (user.name || '').toLowerCase().trim();

      // Count matching project assignments
      let assignedProjectsCount = 0;
      for (const p of projects) {
        let isAssigned = false;
        if (p.assignedDCM && p.assignedDCM.toString() === userIdStr) isAssigned = true;
        if (p.projectCoordinator && p.projectCoordinator.toString() === userIdStr) isAssigned = true;
        if (p.designer && p.designer.toString() === userIdStr) isAssigned = true;
        if (p.executionEngineer && p.executionEngineer.toString() === userIdStr) isAssigned = true;
        if (p.installer && p.installer.toString() === userIdStr) isAssigned = true;
        if (p.architect && p.architect.toString() === userIdStr) isAssigned = true;
        if (isAssigned) assignedProjectsCount += 1;
      }

      // Count active lead assignments if project count is 0
      if (assignedProjectsCount === 0) {
        for (const l of leads) {
          if (l.assignedDCM && l.assignedDCM.toString() === userIdStr) {
            assignedProjectsCount += 1;
          } else if (l.assignedDcmName && l.assignedDcmName.toLowerCase().trim() === userNameLower) {
            assignedProjectsCount += 1;
          }
        }
      }

      const workload = calculateWorkload(assignedProjectsCount);

      return {
        id: user._id.toString(),
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '—',
        role: user.role,
        displayRole: formatRoleLabel(user.role),
        department: user.department || 'General',
        projectCount: assignedProjectsCount,
        workload,
        isActive: user.isActive ?? true,
        createdAt: user.createdAt,
      };
    });

    return sendSuccess(res, 'Members list retrieved', membersList);
  })
);

/**
 * POST /api/v1/members
 * Create a new member with validation and DB persistence
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const validated = createMemberSchema.parse(req.body);

    const emailNormalized = validated.email.toLowerCase().trim();
    const phoneNormalized = validated.phone.trim();

    // Check existing email
    const existingEmail = await UserModel.findOne({ email: emailNormalized });
    if (existingEmail) {
      throw ApiError.conflict('A member with this email address already exists');
    }

    // Check existing phone if phone is provided
    if (phoneNormalized) {
      const cleanPhoneDigits = phoneNormalized.replace(/\D/g, '');
      if (cleanPhoneDigits.length >= 7) {
        const existingUsers = await UserModel.find({ phone: { $exists: true, $ne: '' } })
          .select('phone')
          .lean();
        const duplicatePhone = existingUsers.some(
          (u) => u.phone && u.phone.replace(/\D/g, '') === cleanPhoneDigits
        );
        if (duplicatePhone) {
          throw ApiError.conflict('A member with this contact number already exists');
        }
      }
    }

    const dbRole = mapToDbRole(validated.role);
    let department = validated.department;
    if (!department) {
      if (dbRole === ROLES.DCM || dbRole === ROLES.SENIOR_DCM) department = 'Sales';
      else if (dbRole === ROLES.MANAGER) department = 'Management';
      else if (dbRole === ROLES.ARCHITECT) department = 'Design & Architecture';
      else department = 'Operations';
    }

    // Create User record in MongoDB
    const newUser = await UserModel.create({
      name: validated.name.trim(),
      email: emailNormalized,
      phone: phoneNormalized,
      password: 'EmbellishMember@123', // Standard default hash handled by UserModel pre-save
      role: dbRole,
      department,
      isActive: true,
    });

    // If role is ARCHITECT, sync to Architect model as well
    if (dbRole === ROLES.ARCHITECT) {
      const existingArch = await ArchitectModel.findOne({ email: emailNormalized });
      if (!existingArch) {
        await ArchitectModel.create({
          name: validated.name.trim(),
          email: emailNormalized,
          phone: phoneNormalized,
          isActive: true,
        });
      }
    }

    const result = {
      id: newUser._id.toString(),
      _id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || '—',
      role: newUser.role,
      displayRole: formatRoleLabel(newUser.role),
      department: newUser.department,
      projectCount: 0,
      workload: 'Low',
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    };

    return sendSuccess(res, 'Member created successfully', result, 201);
  })
);

/**
 * GET /api/v1/members/:id
 * Fetch single member with assigned projects details
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id).lean();
    if (!user) {
      throw ApiError.notFound('Member not found');
    }

    const userIdStr = user._id.toString();
    const projects = await ProjectModel.find({
      $or: [
        { assignedDCM: user._id },
        { projectCoordinator: user._id },
        { designer: user._id },
        { executionEngineer: user._id },
        { installer: user._id },
        { architect: user._id },
      ],
    })
      .select('code name stage contractValue estimatedValue siteAddress createdAt')
      .lean();

    const workload = calculateWorkload(projects.length);

    return sendSuccess(res, 'Member details retrieved', {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '—',
      role: user.role,
      displayRole: formatRoleLabel(user.role),
      department: user.department || 'General',
      projectCount: projects.length,
      workload,
      assignedProjects: projects.map((p) => ({
        id: p._id.toString(),
        code: p.code,
        name: p.name,
        stage: p.stage,
        value: p.contractValue || p.estimatedValue || 0,
        city: p.siteAddress?.city || '',
      })),
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    });
  })
);

/**
 * PUT /api/v1/members/:id
 * Update an existing member's details
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      throw ApiError.notFound('Member not found');
    }

    const updateSchema = createMemberSchema.partial();
    const validated = updateSchema.parse(req.body);

    if (validated.email) {
      const emailNormalized = validated.email.toLowerCase().trim();
      const duplicate = await UserModel.findOne({
        email: emailNormalized,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        throw ApiError.conflict('Another member with this email address already exists');
      }
      user.email = emailNormalized;
    }

    if (validated.phone) {
      const phoneNormalized = validated.phone.trim();
      const cleanDigits = phoneNormalized.replace(/\D/g, '');
      if (cleanDigits.length >= 7) {
        const existingUsers = await UserModel.find({
          _id: { $ne: req.params.id },
          phone: { $exists: true, $ne: '' },
        })
          .select('phone')
          .lean();

        const duplicatePhone = existingUsers.some(
          (u) => u.phone && u.phone.replace(/\D/g, '') === cleanDigits
        );
        if (duplicatePhone) {
          throw ApiError.conflict('Another member with this contact number already exists');
        }
      }
      user.phone = phoneNormalized;
    }

    if (validated.name) user.name = validated.name.trim();
    if (validated.role) {
      user.role = mapToDbRole(validated.role);
    }
    if (validated.department) user.department = validated.department.trim();

    await user.save();

    // If role is ARCHITECT, sync to Architect model as well
    if (user.role === ROLES.ARCHITECT) {
      const existingArch = await ArchitectModel.findOne({ email: user.email });
      if (!existingArch) {
        await ArchitectModel.create({
          name: user.name,
          email: user.email,
          phone: user.phone,
          isActive: true,
        });
      } else {
        existingArch.name = user.name;
        existingArch.phone = user.phone;
        await existingArch.save();
      }
    }

    return sendSuccess(res, 'Member updated successfully', {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '—',
      role: user.role,
      displayRole: formatRoleLabel(user.role),
      department: user.department,
      isActive: user.isActive,
      updatedAt: user.updatedAt,
    });
  })
);

/**
 * DELETE /api/v1/members/:id
 * Delete a member from MongoDB
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      throw ApiError.notFound('Member not found');
    }

    await UserModel.findByIdAndDelete(req.params.id);

    // If user was an architect, remove from ArchitectModel as well if needed
    if (user.email) {
      await ArchitectModel.deleteMany({ email: user.email.toLowerCase() });
    }

    return sendSuccess(res, 'Member deleted successfully', { id: req.params.id });
  })
);

export default router;

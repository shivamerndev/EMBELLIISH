import mongoose from 'mongoose';
import ApiError from '../../core/ApiError.js';
import logger from '../../config/logger.js';
import NotificationModel from './notification.model.js';
import UserModel from '../user/user.model.js';
import ProjectModel from '../project/project/project.model.js';
import settingsService from '../settings/settings.service.js';
import mailService from '../../services/mail.service.js';
import { ROLE_PERMISSIONS } from '../../constants/roles.constants.js';

/**
 * Module 19 — Notifications.
 *
 * Two halves. `notify.*` is the write side other modules call when something
 * happened; the query methods below are what the bell icon reads.
 *
 * Delivery never throws. A payment must clear even if the mail server is down —
 * a failed notification is logged and the business action stands.
 */

/** Everyone holding a given permission, via their role. Used for "tell accounts". */
const usersWithPermission = async (permission) => {
  const roles = Object.entries(ROLE_PERMISSIONS)
    .filter(([, permissions]) => permissions.includes(permission))
    .map(([role]) => role);

  return UserModel.find({
    isActive: true,
    $or: [{ role: { $in: roles } }, { permissions: permission }],
  })
    .select('name email role')
    .lean();
};

/** The people actually attached to a project — its DCM, coordinator, installer. */
const projectTeam = async (projectId) => {
  if (!projectId) return [];

  const project = await ProjectModel.findById(projectId)
    .select('assignedDCM projectCoordinator designer executionEngineer installer createdBy')
    .lean();
  if (!project) return [];

  const ids = [
    project.assignedDCM,
    project.projectCoordinator,
    project.designer,
    project.executionEngineer,
    project.installer,
    project.createdBy,
  ]
    .filter(Boolean)
    .map(String);

  if (!ids.length) return [];

  return UserModel.find({ _id: { $in: [...new Set(ids)] }, isActive: true })
    .select('name email role')
    .lean();
};

class NotificationService {
  /**
   * Fans a message out to a list of recipients.
   *
   * @param {Array} recipients user documents (or ids)
   * @param {object} payload   { type, title, body, severity, project, entityType, entityId, link }
   */
  async send(recipients = [], payload = {}, triggeredBy) {
    try {
      const users = recipients.filter(Boolean);
      if (!users.length) return { created: 0 };

      const settings = await settingsService.get();

      // The person who caused the event does not need telling about it.
      const targets = users.filter((user) => String(user._id ?? user) !== String(triggeredBy || ''));
      if (!targets.length) return { created: 0 };

      const docs = targets.map((user) => ({
        recipient: user._id ?? user,
        type: payload.type || 'INFO',
        severity: payload.severity || 'INFO',
        title: payload.title,
        body: payload.body,
        project: payload.project,
        entityType: payload.entityType,
        entityId: payload.entityId,
        link: payload.link,
        triggeredBy,
      }));

      const created = await NotificationModel.insertMany(docs);

      if (settings.notifications?.emailEnabled) {
        await this.#email(targets, payload, created);
      }

      return { created: created.length };
    } catch (error) {
      // Never let a notification failure roll back the thing that happened.
      logger.error(`[notify] ${payload.type}: ${error.message}`);
      return { created: 0, error: error.message };
    }
  }

  /** Tell whoever can act on this — "accounts", "the factory", "the founder". */
  async toPermission(permission, payload, triggeredBy) {
    return this.send(await usersWithPermission(permission), payload, triggeredBy);
  }

  /** Tell the people on this project. */
  async toProjectTeam(projectId, payload, triggeredBy) {
    return this.send(await projectTeam(projectId), { ...payload, project: projectId }, triggeredBy);
  }

  async toUsers(userIds = [], payload, triggeredBy) {
    const ids = userIds.filter(Boolean);
    if (!ids.length) return { created: 0 };
    const users = await UserModel.find({ _id: { $in: ids }, isActive: true }).select('name email').lean();
    return this.send(users, payload, triggeredBy);
  }

  /* ------------------------------------------------------------- read side */

  async listForUser(userId, { unreadOnly, limit = 30, page = 1 } = {}) {
    const filter = { recipient: new mongoose.Types.ObjectId(String(userId)) };
    if (String(unreadOnly) === 'true') filter.isRead = false;

    const take = Math.min(Number(limit) || 30, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [items, total, unread] = await Promise.all([
      NotificationModel.find(filter).sort('-createdAt').skip(skip).limit(take).lean(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({ recipient: filter.recipient, isRead: false }),
    ]);

    return {
      items: items.map((item) => ({ ...item, id: String(item._id) })),
      unread,
      pagination: { page: Number(page) || 1, limit: take, total, pages: Math.ceil(total / take) || 1 },
    };
  }

  async unreadCount(userId) {
    return NotificationModel.countDocuments({ recipient: userId, isRead: false });
  }

  async markRead(id, userId) {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) throw ApiError.notFound('Notification not found');
    return { ...notification, id: String(notification._id) };
  }

  async markAllRead(userId) {
    const result = await NotificationModel.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return { updated: result.modifiedCount ?? 0 };
  }

  /** Best-effort email copy. Failures are recorded on the notification, not thrown. */
  async #email(targets, payload, created) {
    await Promise.all(
      targets.map(async (user, index) => {
        if (!user.email) return;
        try {
          await mailService.send({
            to: user.email,
            subject: payload.title,
            text: payload.body || payload.title,
          });
          await NotificationModel.updateOne({ _id: created[index]._id }, { $set: { emailStatus: 'SENT' } });
        } catch (error) {
          logger.warn(`[notify] email to ${user.email} failed: ${error.message}`);
          await NotificationModel.updateOne({ _id: created[index]._id }, { $set: { emailStatus: 'FAILED' } });
        }
      })
    );
  }
}

const notify = new NotificationService();

export default notify;
export { notify, usersWithPermission, projectTeam };

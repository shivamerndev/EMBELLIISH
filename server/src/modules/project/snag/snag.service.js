import mongoose from 'mongoose';
import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import SnagModel from './snag.model.js';
import InstallationModel from '../installation/installation.model.js';
import productionService from '../../production/production/production.service.js';
import projectService from '../project/project.service.js';
import notify from '../../notification/notification.service.js';
import { SNAG_STATUS } from '../../../constants/workflow.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';

const snagRepository = new BaseRepository(SnagModel, {
  filterable: ['project', 'room', 'status', 'type', 'severity'],
  searchable: ['code', 'title', 'roomName'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'reportedBy', select: 'name role' },
  ],
});

/**
 * Step 20 — "This curtain is 2 inches longer."
 *
 *   Installer reports → ERP raises a rework ticket → factory alters → returns →
 *   ticket closes.
 *
 * Raising a snag against a production order automatically creates the alteration
 * work order, so nobody has to remember to tell the factory.
 */
class SnagService extends BaseService {
  constructor() {
    super(snagRepository, 'Snag');
  }

  async create(data, user) {
    const snag = await SnagModel.create({
      ...data,
      code: await nextCode('SNG'),
      reportedBy: user?.id,
      reportedAt: new Date(),
      history: [{ action: 'REPORTED', to: SNAG_STATUS.OPEN, note: data.deviation, by: user?.id }],
    });

    if (data.installation) {
      await InstallationModel.updateOne(
        { _id: data.installation },
        { $push: { snagsRaised: snag._id } }
      );
    }

    // The factory needs a work order, not a note.
    if (data.productionOrder) {
      const rework = await productionService.createRework(
        data.productionOrder,
        { reason: `${snag.code}: ${snag.title}${snag.deviation ? ` (${snag.deviation})` : ''}` },
        user
      );
      snag.reworkOrder = rework.id;
      snag.status = SNAG_STATUS.IN_REWORK;
      snag.reworkStartedAt = new Date();
      snag.history.push({ action: 'REWORK_RAISED', to: SNAG_STATUS.IN_REWORK, note: rework.code, by: user?.id });
      await snag.save();
    }

    // Module 19: a snag is a complaint from a client standing in their own home.
    // The factory and the project team both need to know the moment it is raised.
    await notify.toPermission(
      PERMISSIONS.PRODUCTION_MANAGE,
      {
        type: 'SNAG_RAISED',
        severity: snag.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: `Snag ${snag.code} — ${snag.title}`,
        body: `${snag.roomName || 'Site'}: ${snag.deviation || snag.description || snag.type}`,
        project: snag.project,
        entityType: 'Snag',
        entityId: snag._id,
        link: `/projects/${snag.project}?tab=delivery`,
      },
      user?.id
    );
    await notify.toProjectTeam(
      snag.project,
      {
        type: 'SNAG_RAISED',
        severity: 'WARNING',
        title: `Snag raised on site — ${snag.title}`,
        body: snag.deviation || snag.description || '',
        entityType: 'Snag',
        entityId: snag._id,
        link: `/projects/${snag.project}?tab=delivery`,
      },
      user?.id
    );

    return snag.toJSON();
  }

  async markReady(id, { note } = {}, user) {
    const snag = await this.#load(id);
    if (snag.status === SNAG_STATUS.CLOSED) throw ApiError.conflict('This snag is already closed');

    snag.status = SNAG_STATUS.READY;
    snag.readyAt = new Date();
    snag.history.push({ action: 'READY', to: SNAG_STATUS.READY, note, by: user?.id });
    await snag.save();

    return snag.toJSON();
  }

  async close(id, { resolution } = {}, user) {
    const snag = await this.#load(id);
    if (snag.status === SNAG_STATUS.CLOSED) throw ApiError.conflict('This snag is already closed');

    snag.status = SNAG_STATUS.CLOSED;
    snag.resolvedAt = new Date();
    snag.resolvedBy = user?.id;
    snag.resolution = resolution;
    snag.history.push({ action: 'CLOSED', to: SNAG_STATUS.CLOSED, note: resolution, by: user?.id });
    await snag.save();

    // Closing the last open snag may be what finally unblocks project closure.
    await projectService.tryAutoAdvance(snag.project, user, `Snag ${snag.code} closed`);

    return snag.toJSON();
  }

  async projectSummary(projectId) {
    const rows = await SnagModel.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(String(projectId)) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const byStatus = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const open = Object.entries(byStatus)
      .filter(([status]) => status !== SNAG_STATUS.CLOSED)
      .reduce((sum, [, count]) => sum + count, 0);

    return {
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      open,
      closed: byStatus[SNAG_STATUS.CLOSED] || 0,
      byStatus: Object.values(SNAG_STATUS).map((status) => ({ status, count: byStatus[status] || 0 })),
    };
  }

  async addMedia(id, { photos = [] }) {
    const snag = await this.#load(id);
    snag.photos = [...(snag.photos || []), ...photos];
    await snag.save();
    return snag.toJSON();
  }

  async deleteMedia(id, { photoId, url }) {
    const snag = await this.#load(id);
    let photos = snag.photos || [];

    if (photoId || url) {
      photos = photos.filter((p) => {
        if (photoId && (p._id?.toString() === photoId || p.id?.toString() === photoId)) return false;
        if (url && p.url === url) return false;
        return true;
      });
    }

    snag.photos = photos;
    await snag.save();
    return snag.toJSON();
  }

  async #load(id) {
    const snag = await SnagModel.findById(id);
    if (!snag) throw ApiError.notFound('Snag not found');
    return snag;
  }
}

export default new SnagService();
export { snagRepository };

import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import InstallationModel from './installation.model.js';
import ProjectModel from '../project/project.model.js';
import RoomModel from '../room/room.model.js';
import PackingBoxModel from '../../production/packing/packing.model.js';
import projectService from '../project/project.service.js';
import { GATE_CHECKS } from '../project/project.gates.js';

const installationRepository = new BaseRepository(InstallationModel, {
  filterable: ['project', 'room', 'status', 'leadInstaller'],
  searchable: ['code', 'roomName'],
  populate: [
    { path: 'project', select: 'name code' },
    { path: 'leadInstaller', select: 'name phone' },
  ],
  defaultSort: 'scheduledDate',
});

/**
 * Steps 18 & 19 — the balance clears, then the team goes to the villa.
 *
 * The money check lives here rather than only in the stage machine, because an
 * installation can be scheduled for a single room without the whole project
 * moving stage, and that must not become a way around Step 18.
 */
class InstallationService extends BaseService {
  constructor() {
    super(installationRepository, 'Installation');
  }

  async create(data, user) {
    const project = await ProjectModel.findById(data.project);
    if (!project) throw ApiError.notFound('Project not found');

    const balance = await GATE_CHECKS.balanceCleared(project);
    if (!balance.passed) {
      throw ApiError.workflow(`Installation cannot be scheduled — ${balance.detail}`, [
        { gate: 'balanceCleared', message: balance.detail },
      ]);
    }

    const room = data.room ? await RoomModel.findById(data.room).lean() : null;

    // Seed the checklist from what was actually packed for this room, so the
    // team ticks off the same items the box says are inside.
    let checklist = data.checklist;
    if (!checklist?.length && data.room) {
      const boxes = await PackingBoxModel.find({ project: data.project, room: data.room }).lean();
      checklist = boxes.flatMap((box) =>
        box.contents.map((item) => ({
          item: ['CURTAIN', 'SHEER', 'ROMAN_BLIND', 'WOODEN_BLIND', 'TRACK', 'MOTOR', 'REMOTE', 'TIEBACK', 'PELMET', 'BRACKET'].includes(item.type)
            ? item.type
            : 'CURTAIN',
          windowLabel: item.windowLabel,
          installed: false,
        }))
      );
    }

    const installation = await InstallationModel.create({
      ...data,
      code: await nextCode('INS'),
      roomName: room?.name || data.roomName,
      checklist,
      history: [{ action: 'SCHEDULED', by: user?.id }],
    });

    return installation.toJSON();
  }

  async start(id, user) {
    const installation = await this.#load(id);
    installation.status = 'IN_PROGRESS';
    installation.startedAt = new Date();
    installation.history.push({ action: 'STARTED', by: user?.id });
    await installation.save();
    return installation.toJSON();
  }

  /**
   * Step 19 — everything up, photos uploaded. A partially completed checklist
   * records the visit as PARTIAL rather than pretending it is done.
   */
  async complete(id, { photos, clientPresent, clientRemarks, checklist } = {}, user) {
    const installation = await this.#load(id);

    if (checklist) installation.checklist = checklist;
    if (photos?.length) installation.photos.push(...photos);

    const items = installation.checklist || [];
    const allInstalled = items.length === 0 || items.every((item) => item.installed);

    installation.status = allInstalled ? 'COMPLETED' : 'PARTIAL';
    installation.completedAt = allInstalled ? new Date() : undefined;
    installation.clientPresent = clientPresent ?? installation.clientPresent;
    installation.clientRemarks = clientRemarks;
    installation.history.push({
      action: allInstalled ? 'COMPLETED' : 'PARTIALLY_COMPLETED',
      note: clientRemarks,
      by: user?.id,
    });

    await installation.save();

    if (allInstalled) {
      await projectService.tryAutoAdvance(installation.project, user, `Installation ${installation.code} complete`);
    }

    return installation.toJSON();
  }

  async projectSummary(projectId) {
    const installations = await InstallationModel.find({ project: projectId }).lean();

    const totalItems = installations.reduce((sum, i) => sum + (i.checklist?.length || 0), 0);
    const installedItems = installations.reduce(
      (sum, i) => sum + (i.checklist?.filter((c) => c.installed).length || 0),
      0
    );

    return {
      visits: installations.length,
      completed: installations.filter((i) => i.status === 'COMPLETED').length,
      totalItems,
      installedItems,
      percent: totalItems ? Math.round((installedItems / totalItems) * 100) : 0,
    };
  }

  async #load(id) {
    const installation = await InstallationModel.findById(id);
    if (!installation) throw ApiError.notFound('Installation not found');
    return installation;
  }
}

export default new InstallationService();
export { installationRepository };

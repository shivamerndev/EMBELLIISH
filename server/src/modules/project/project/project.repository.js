import BaseRepository from '../../../core/BaseRepository.js';
import ProjectModel from './project.model.js';

class ProjectRepository extends BaseRepository {
  constructor() {
    super(ProjectModel, {
      filterable: ['stage', 'client', 'architect', 'assignedDCM', 'projectCoordinator', 'installer', 'isActivated', 'isOnHold', 'projectType'],
      searchable: ['name', 'code'],
      populate: [
        { path: 'client', select: 'name phone code company' },
        { path: 'architect', select: 'name firm' },
        { path: 'assignedDCM', select: 'name email role' },
        { path: 'projectCoordinator', select: 'name email role' },
      ],
    });
  }

  /** Count of projects per stage, for the pipeline widget on the dashboard. */
  async countByStage() {
    return this.model.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $project: { _id: 0, stage: '$_id', count: 1 } },
    ]);
  }
}

export default new ProjectRepository();

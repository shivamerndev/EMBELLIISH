import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import DispatchModel from './dispatch.model.js';
import PackingBoxModel from '../packing/packing.model.js';
import projectService from '../../project/project/project.service.js';

const dispatchRepository = new BaseRepository(DispatchModel, {
  filterable: ['project', 'status'],
  searchable: ['code', 'vehicleNo', 'transporter'],
  populate: [{ path: 'project', select: 'name code' }],
  defaultSort: '-dispatchedAt',
});

/** The boxes leaving the factory for the villa. */
class DispatchService extends BaseService {
  constructor() {
    super(dispatchRepository, 'Dispatch');
  }

  async create(data, user) {
    const boxes = await PackingBoxModel.find({
      _id: { $in: data.boxes || [] },
      project: data.project,
    });

    if (!boxes.length) throw ApiError.badRequest('Select at least one packed box to dispatch');

    const alreadyGone = boxes.filter((box) => box.status !== 'PACKED');
    if (alreadyGone.length) {
      throw ApiError.workflow(
        `Box ${alreadyGone.map((b) => b.boxNumber).join(', ')} has already been dispatched`
      );
    }

    const dispatch = await DispatchModel.create({
      ...data,
      code: await nextCode('DSP'),
      boxCount: boxes.length,
      status: 'IN_TRANSIT',
      dispatchedBy: user?.id,
      history: [{ action: 'DISPATCHED', note: `${boxes.length} box(es)`, by: user?.id }],
    });

    await PackingBoxModel.updateMany(
      { _id: { $in: boxes.map((b) => b._id) } },
      { $set: { status: 'DISPATCHED', dispatch: dispatch._id } }
    );

    await projectService.tryAutoAdvance(data.project, user, `Dispatch ${dispatch.code} left the factory`);

    return dispatch.toJSON();
  }

  async markDelivered(id, { receivedBy, deliveredAt, photos } = {}, user) {
    const dispatch = await DispatchModel.findById(id);
    if (!dispatch) throw ApiError.notFound('Dispatch not found');

    dispatch.status = 'DELIVERED';
    dispatch.deliveredAt = deliveredAt || new Date();
    dispatch.receivedBy = receivedBy;
    if (photos) dispatch.photos.push(...photos);
    dispatch.history.push({ action: 'DELIVERED', note: receivedBy, by: user?.id });
    await dispatch.save();

    await PackingBoxModel.updateMany({ dispatch: dispatch._id }, { $set: { status: 'DELIVERED' } });

    return dispatch.toJSON();
  }
}

export default new DispatchService();
export { dispatchRepository };

import BaseService from '../../../core/BaseService.js';
import BaseRepository from '../../../core/BaseRepository.js';
import ApiError from '../../../core/ApiError.js';
import { nextCode } from '../../../core/sequence.js';
import PackingBoxModel from './packing.model.js';
import ProductionOrderModel from '../production/production.model.js';
import RoomModel from '../../project/room/room.model.js';
import projectService from '../../project/project/project.service.js';
import { PRODUCTION_STAGE, PARTICULAR_TO_CONTENT } from './packing.constants.js';

const packingRepository = new BaseRepository(PackingBoxModel, {
  filterable: ['project', 'room', 'status'],
  searchable: ['code', 'roomName'],
  populate: [{ path: 'project', select: 'name code' }],
  defaultSort: 'boxNumber',
});

/**
 * Step 17 — curtains packed room-wise, so the ERP knows exactly what is inside
 * each box. Only QC-passed pieces may be boxed; that is what makes the packing
 * list trustworthy on site.
 */
class PackingService extends BaseService {
  constructor() {
    super(packingRepository, 'Packing box');
  }

  /**
   * Packs one box per room from everything that has passed QC and is not yet in
   * a box. Motors, remotes and tiebacks are added alongside the curtain, exactly
   * as the story describes Box 1.
   */
  async packByRoom(projectId, user) {
    const orders = await ProductionOrderModel.find({
      project: projectId,
      qcStatus: 'PASS',
      packingBox: { $exists: false },
    }).lean();

    if (!orders.length) {
      throw ApiError.workflow('Nothing to pack — no QC-passed pieces are waiting for a box');
    }

    const rooms = await RoomModel.find({ project: projectId }).sort('floor sequence name').lean();
    const roomOrder = new Map(rooms.map((room, index) => [String(room._id), index]));

    const byRoom = new Map();
    orders.forEach((order) => {
      const key = String(order.room || 'unassigned');
      if (!byRoom.has(key)) byRoom.set(key, []);
      byRoom.get(key).push(order);
    });

    const lastBox = await PackingBoxModel.findOne({ project: projectId }).sort('-boxNumber').lean();
    let boxNumber = (lastBox?.boxNumber || 0) + 1;

    const groups = [...byRoom.entries()].sort(
      ([a], [b]) => (roomOrder.get(a) ?? 999) - (roomOrder.get(b) ?? 999)
    );

    const boxes = [];
    for (const [roomId, roomOrders] of groups) {
      const contents = [];

      roomOrders.forEach((order) => {
        contents.push({
          type: PARTICULAR_TO_CONTENT[order.particular] || 'CURTAIN',
          description: `${order.particularLabel} — ${order.windowLabel} (${order.parts} panels)`,
          quantity: 1,
          productionOrder: order._id,
          windowLabel: order.windowLabel,
        });

        if (order.motorRequired) {
          contents.push({ type: 'MOTOR', description: `Motor for ${order.windowLabel}`, quantity: 1, productionOrder: order._id, windowLabel: order.windowLabel });
          contents.push({ type: 'REMOTE', description: `Remote for ${order.windowLabel}`, quantity: 1, productionOrder: order._id, windowLabel: order.windowLabel });
        }
      });

      // eslint-disable-next-line no-await-in-loop
      const box = await PackingBoxModel.create({
        code: await nextCode('BOX'),
        boxNumber,
        project: projectId,
        room: roomId === 'unassigned' ? undefined : roomId,
        roomName: roomOrders[0]?.roomName || 'Unassigned',
        contents,
        packedBy: user?.id,
      });

      // eslint-disable-next-line no-await-in-loop
      await ProductionOrderModel.updateMany(
        { _id: { $in: roomOrders.map((o) => o._id) } },
        { $set: { packingBox: box._id, stage: PRODUCTION_STAGE.COMPLETED, completedAt: new Date() } }
      );

      boxes.push(box.toJSON());
      boxNumber += 1;
    }

    await projectService.tryAutoAdvance(projectId, user, `${boxes.length} box(es) packed`);

    return { count: boxes.length, boxes };
  }

  async addContent(id, item, user) {
    const box = await PackingBoxModel.findById(id);
    if (!box) throw ApiError.notFound('Packing box not found');
    if (box.status !== 'PACKED') throw ApiError.workflow('This box has already left the factory');

    box.contents.push(item);
    box.packedBy = box.packedBy || user?.id;
    await box.save();

    return box.toJSON();
  }

  /** The installer ticking items off against the box list on site. */
  async verifyOnSite(id, { verifiedIndexes = [] }, user) {
    const box = await PackingBoxModel.findById(id);
    if (!box) throw ApiError.notFound('Packing box not found');

    verifiedIndexes.forEach((index) => {
      if (box.contents[index]) box.contents[index].verifiedOnSite = true;
    });

    box.status = 'OPENED';
    box.remarks = `Verified on site by ${user?.name || 'installer'}`;
    await box.save();

    return box.toJSON();
  }

  /** The packing list a client or installer can actually read. */
  async packingList(projectId) {
    const boxes = await PackingBoxModel.find({ project: projectId }).sort('boxNumber').lean();

    return {
      totalBoxes: boxes.length,
      totalItems: boxes.reduce((sum, box) => sum + box.contents.length, 0),
      boxes: boxes.map((box) => ({
        boxNumber: box.boxNumber,
        code: box.code,
        room: box.roomName,
        status: box.status,
        items: box.contents.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          verified: item.verifiedOnSite,
        })),
      })),
    };
  }
}

export default new PackingService();
export { packingRepository };

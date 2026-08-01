import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import ApiError from '../../../core/ApiError.js';
import RoomModel from './room.model.js';
import MeasurementModel from '../measurement/measurement.model.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../project/project.validation.js';

const roomSchema = z.object({
  project: objectId,
  name: z.string().min(1, 'Room name is required'),
  floor: z.string().optional(),
  sequence: z.coerce.number().int().optional(),
  ceilingHeightInch: z.coerce.number().nonnegative().optional(),
  pelmetPresent: z.boolean().optional(),
  wiringAvailable: z.boolean().optional(),
  curtainStyle: z.string().optional(),
  notes: z.string().optional(),
});

class RoomService extends BaseService {
  /** A room with windows still attached must not vanish under the BOQ. */
  async remove(id) {
    const windows = await MeasurementModel.countDocuments({ room: id });
    if (windows > 0) {
      throw ApiError.workflow(
        `This room still has ${windows} window(s) measured against it. Delete those first.`
      );
    }
    return super.remove(id);
  }
}

const { router, service } = defineModule({
  model: RoomModel,
  label: 'Room',
  filterable: ['project', 'floor'],
  searchable: ['name'],
  defaultSort: 'floor sequence name',
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.MEASUREMENT_MANAGE,
  createSchema: roomSchema,
  updateSchema: roomSchema.partial().omit({ project: true }),
  serviceClass: RoomService,
  extend: (r, { canView, canManage }) => {
    // Rooms with their windows nested — what the measurement screen renders.
    r.get(
      '/project/:projectId',
      ...canView,
      asyncHandler(async (req, res) => {
        const rooms = await RoomModel.find({ project: req.params.projectId })
          .sort('floor sequence name')
          .lean();
        const windows = await MeasurementModel.find({ project: req.params.projectId })
          .sort('sequence')
          .lean();

        const data = rooms.map((room) => ({
          ...room,
          windows: windows.filter((w) => String(w.room) === String(room._id)),
        }));

        return sendSuccess(res, 'Rooms retrieved', data);
      })
    );

    // Creating a villa's room list one at a time is nobody's idea of a good time.
    r.post(
      '/bulk',
      ...canManage,
      asyncHandler(async (req, res) => {
        const parsed = z.object({ project: objectId, rooms: z.array(roomSchema.omit({ project: true })) })
          .parse(req.body);

        const created = await RoomModel.insertMany(
          parsed.rooms.map((room, index) => ({ ...room, project: parsed.project, sequence: room.sequence ?? index }))
        );
        return sendSuccess(res, `${created.length} room(s) created`, created, 201);
      })
    );
  },
});

export default router;
export { service as roomService };

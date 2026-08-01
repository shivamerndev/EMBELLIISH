import { z } from 'zod';
import defineModule from '../../../core/defineModule.js';
import BaseService from '../../../core/BaseService.js';
import asyncHandler from '../../../core/asyncHandler.js';
import ApiError from '../../../core/ApiError.js';
import MeasurementModel from './measurement.model.js';
import RoomModel from '../room/room.model.js';
import projectService from '../project/project.service.js';
import { readySizeSheet, setReadySize, confirmAllReadySizes } from './readysize.service.js';
import { calculateWindow } from '../../../services/consumption.service.js';
import { sendSuccess } from '../../../utils/responseHandler.js';
import { PARTICULAR, CURTAIN_STYLE } from '../../../constants/product.constants.js';
import { PERMISSIONS } from '../../../constants/roles.constants.js';
import { objectId } from '../project/project.validation.js';

const sizeSchema = z
  .object({ width: z.coerce.number().nonnegative().optional(), height: z.coerce.number().nonnegative().optional() })
  .optional();

const measurementSchema = z.object({
  project: objectId,
  room: objectId,
  label: z.string().optional(),
  sequence: z.coerce.number().int().optional(),
  particular: z.enum(Object.values(PARTICULAR)).optional(),
  o2o: sizeSchema,
  f2f: sizeSchema,
  readySize: z
    .object({
      widthInch: z.coerce.number().nonnegative().optional(),
      heightInch: z.coerce.number().nonnegative().optional(),
      widthAllowanceInch: z.coerce.number().nonnegative().optional(),
      dropAllowanceInch: z.coerce.number().nonnegative().optional(),
      note: z.string().optional(),
    })
    .optional(),
  pelmet: z
    .object({
      o2oWidth: z.coerce.number().nonnegative().optional(),
      o2oDrop: z.coerce.number().nonnegative().optional(),
      f2fWidth: z.coerce.number().nonnegative().optional(),
      f2fDrop: z.coerce.number().nonnegative().optional(),
    })
    .optional(),
  wire: z.object({ left: z.boolean().optional(), right: z.boolean().optional() }).optional(),
  wireDropFt: z.coerce.number().nonnegative().optional(),
  motorRequired: z.boolean().optional(),
  motorQty: z.coerce.number().int().nonnegative().optional(),
  curtainStyle: z.enum(Object.values(CURTAIN_STYLE)).optional(),
  fullness: z.coerce.number().positive().optional(),
  fabricWidthInch: z.coerce.number().positive().optional(),
  heightAllowanceInch: z.coerce.number().nonnegative().optional(),
  partsOverride: z.coerce.number().nonnegative().optional(),
  overrideReason: z.string().optional(),
  fabric: objectId.optional(),
  blackoutFabric: objectId.optional(),
  motor: objectId.optional(),
  remarks: z.string().optional(),
});

class MeasurementService extends BaseService {
  async create(data, user) {
    const created = await this.repository.create({ ...data, measuredBy: user?.id });
    // Entering the first window is what completes the Measurement stage.
    await projectService.tryAutoAdvance(data.project, user, 'Window measurements entered');
    return created;
  }

  /**
   * Editing anything the finished size depends on retracts the Step-4 sign-off.
   *
   * Otherwise a window could be re-measured after its ready size was confirmed
   * and walk onto the factory floor still carrying yesterday's approval — which
   * is the failure the confirmation exists to prevent.
   */
  async update(id, data, user) {
    const current = await MeasurementModel.findById(id);
    if (!current) throw ApiError.notFound('Measurement not found');

    const before = readyFingerprint(current);
    Object.assign(current, data);
    if (data.readySize) {
      Object.assign(current.readySize, data.readySize);
    }

    if (current.readySize?.confirmed && readyFingerprint(current) !== before) {
      current.readySize.confirmed = false;
      current.readySize.confirmedBy = undefined;
      current.readySize.confirmedAt = undefined;
    }

    await current.save();
    return current.toJSON();
  }
}

/** The inputs a confirmed ready size depends on; a change to any of them retracts it. */
const readyFingerprint = (m) =>
  JSON.stringify([
    m.particular,
    m.o2o?.width, m.o2o?.height,
    m.f2f?.width, m.f2f?.height,
    m.readySize?.widthInch, m.readySize?.heightInch,
    m.readySize?.widthAllowanceInch, m.readySize?.dropAllowanceInch,
  ]);

const { router, service } = defineModule({
  model: MeasurementModel,
  label: 'Measurement',
  filterable: ['project', 'room', 'particular', 'motorRequired'],
  searchable: ['label', 'remarks'],
  defaultSort: 'sequence',
  populate: [{ path: 'fabric', select: 'name colour usableWidthInch recommendedFullness' }],
  viewPermission: PERMISSIONS.PROJECT_VIEW,
  managePermission: PERMISSIONS.MEASUREMENT_MANAGE,
  createSchema: measurementSchema,
  updateSchema: measurementSchema.partial().omit({ project: true }),
  serviceClass: MeasurementService,
  extend: (r, { canView, canManage }) => {
    /**
     * Live consumption for a single row, without saving anything. The measurement
     * form calls this as the coordinator types so the panel count and fabric
     * metres update in front of them.
     */
    r.post(
      '/calculate',
      ...canView,
      asyncHandler(async (req, res) => {
        const line = calculateWindow(req.body || {}, req.body?.config || {});
        return sendSuccess(res, 'Window consumption calculated', line);
      })
    );

    r.post(
      '/bulk',
      ...canManage,
      asyncHandler(async (req, res) => {
        const parsed = z
          .object({ project: objectId, windows: z.array(measurementSchema.omit({ project: true })) })
          .parse(req.body);

        const created = await MeasurementModel.insertMany(
          parsed.windows.map((window, index) => ({
            ...window,
            project: parsed.project,
            sequence: window.sequence ?? index,
            measuredBy: req.user?.id,
          }))
        );

        await projectService.tryAutoAdvance(parsed.project, req.user, 'Window measurements entered');
        return sendSuccess(res, `${created.length} window(s) recorded`, created, 201);
      })
    );

    /**
     * Step 4 — the ready-size sheet: window size and finished size side by side,
     * with what is still unsigned called out. This is the screen the coordinator
     * walks through with the DCM before anything reaches the cutting table.
     */
    r.get(
      '/project/:projectId/ready-size',
      ...canView,
      asyncHandler(async (req, res) => {
        const data = await readySizeSheet(req.params.projectId);
        return sendSuccess(res, 'Ready size sheet retrieved', data);
      })
    );

    /**
     * Sets and/or signs off the finished size for one window.
     *
     * Confirmation is a separate act from measurement on purpose: the person who
     * held the tape is not always the person who knows the curtain is meant to
     * stop at the sill.
     */
    r.post(
      '/:id/ready-size',
      ...canManage,
      asyncHandler(async (req, res) => {
        const payload = z
          .object({
            widthInch: z.coerce.number().positive().optional(),
            heightInch: z.coerce.number().positive().optional(),
            widthAllowanceInch: z.coerce.number().nonnegative().optional(),
            dropAllowanceInch: z.coerce.number().nonnegative().optional(),
            note: z.string().optional(),
            confirm: z.boolean().optional(),
          })
          .parse(req.body || {});

        const data = await setReadySize(req.params.id, payload, req.user);
        return sendSuccess(
          res,
          payload.confirm === false ? 'Ready size sign-off withdrawn' : 'Ready size saved',
          data
        );
      })
    );

    /**
     * Signs off every window whose finished size is already derivable. Windows
     * with no usable measurement are reported back rather than waved through.
     */
    r.post(
      '/project/:projectId/ready-size/confirm-all',
      ...canManage,
      asyncHandler(async (req, res) => {
        const data = await confirmAllReadySizes(req.params.projectId, req.body?.note, req.user);
        return sendSuccess(res, `${data.confirmed} window(s) signed off`, data);
      })
    );

    r.get(
      '/project/:projectId',
      ...canView,
      asyncHandler(async (req, res) => {
        const rooms = await RoomModel.find({ project: req.params.projectId }).lean();
        const roomById = new Map(rooms.map((room) => [String(room._id), room]));

        const windows = await MeasurementModel.find({ project: req.params.projectId })
          .sort('sequence')
          .lean();

        const data = windows.map((window) => ({
          ...window,
          roomName: roomById.get(String(window.room))?.name,
          floor: roomById.get(String(window.room))?.floor,
          calculated: calculateWindow(window),
        }));

        return sendSuccess(res, 'Measurement sheet retrieved', data);
      })
    );
  },
});

export default router;
export { service as measurementService };

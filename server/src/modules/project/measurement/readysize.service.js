import ApiError from '../../../core/ApiError.js';
import MeasurementModel from './measurement.model.js';
import RoomModel from '../room/room.model.js';
import ProjectModel from '../project/project.model.js';
import { calculateWindow } from '../../../services/consumption.service.js';

/**
 * Step 4 — Ready Size.
 *
 * "Window Height 10 Feet. Lekin curtain floor touch karega. To Ready Size 10.5
 * Feet ho sakti hai." The FRD says this over and over because it is the company's
 * most expensive recurring mistake, so the ERP treats the finished size as its
 * own signed-off fact rather than something each department re-derives.
 *
 * The rule the rest of the system leans on: nothing is cut or stitched until
 * every window on the project carries a confirmed ready size.
 */

const readySizeLine = (measurement, config, roomsById) => {
  const line = calculateWindow(measurement, config);
  const room = roomsById?.get(String(measurement.room));

  return {
    id: String(measurement._id),
    room: measurement.room ? String(measurement.room) : null,
    roomName: room?.name || 'Unassigned',
    floor: room?.floor || '',
    label: measurement.label,
    particular: line.particular,
    particularLabel: line.particularLabel,
    basis: line.basis,

    windowWidthInch: line.windowWidthInch,
    windowHeightInch: line.windowHeightInch,
    readyWidthInch: line.readyWidthInch,
    readyHeightInch: line.readyHeightInch,
    derivedWidthInch: line.windowWidthInch
      ? Number((line.windowWidthInch + line.readyWidthAllowanceInch).toFixed(2))
      : 0,
    derivedHeightInch: line.windowHeightInch
      ? Number((line.windowHeightInch + line.readyDropAllowanceInch).toFixed(2))
      : 0,
    widthAllowanceInch: line.readyWidthAllowanceInch,
    dropAllowanceInch: line.readyDropAllowanceInch,

    source: line.readySizeSource,
    confirmed: line.readySizeConfirmed,
    confirmedAt: measurement.readySize?.confirmedAt || null,
    note: line.readySizeNote,
    /** A row with no usable opening cannot be signed off — there is nothing to sign. */
    measurable: line.readyWidthInch > 0 && line.readyHeightInch > 0,
  };
};

/** Window size against finished size, room by room, with the sign-off status. */
const readySizeSheet = async (projectId) => {
  const project = await ProjectModel.findById(projectId).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const [rooms, measurements] = await Promise.all([
    RoomModel.find({ project: projectId }).sort('floor sequence name').lean(),
    MeasurementModel.find({ project: projectId }).sort('sequence').lean(),
  ]);

  const roomsById = new Map(rooms.map((room) => [String(room._id), room]));
  const lines = measurements.map((m) => readySizeLine(m, project.consumptionConfig, roomsById));

  return {
    project: { id: String(project._id), code: project.code, name: project.name },
    allowances: {
      widthInch: project.consumptionConfig?.readyWidthAllowanceInch ?? 0,
      dropInch: project.consumptionConfig?.readyDropAllowanceInch ?? 0,
      romanWidthInch: project.consumptionConfig?.romanReadyWidthAllowanceInch ?? 0,
      romanDropInch: project.consumptionConfig?.romanReadyDropAllowanceInch ?? 0,
    },
    lines,
    summary: {
      total: lines.length,
      confirmed: lines.filter((l) => l.confirmed).length,
      pending: lines.filter((l) => !l.confirmed).length,
      overridden: lines.filter((l) => l.source === 'MANUAL').length,
      unmeasurable: lines.filter((l) => !l.measurable).length,
      allConfirmed: lines.length > 0 && lines.every((l) => l.confirmed),
    },
  };
};

/**
 * Writes the finished size for one window, and optionally signs it off.
 *
 * `confirm: false` withdraws an existing sign-off — the honest way to reopen a
 * window whose drop turned out to be wrong, instead of quietly editing around it.
 */
const setReadySize = async (measurementId, payload = {}, user) => {
  const measurement = await MeasurementModel.findById(measurementId);
  if (!measurement) throw ApiError.notFound('Measurement not found');

  const fields = ['widthInch', 'heightInch', 'widthAllowanceInch', 'dropAllowanceInch', 'note'];
  fields.forEach((field) => {
    if (payload[field] !== undefined) measurement.readySize[field] = payload[field];
  });

  if (payload.confirm === false) {
    measurement.readySize.confirmed = false;
    measurement.readySize.confirmedBy = undefined;
    measurement.readySize.confirmedAt = undefined;
  } else if (payload.confirm) {
    const project = await ProjectModel.findById(measurement.project).lean();
    const line = calculateWindow(measurement.toObject(), project?.consumptionConfig);

    if (!(line.readyWidthInch > 0) || !(line.readyHeightInch > 0)) {
      throw ApiError.workflow(
        `${measurement.label || 'This window'} has no usable size yet — record the window measurement or type the finished size before signing it off`
      );
    }

    measurement.readySize.confirmed = true;
    measurement.readySize.confirmedBy = user?.id;
    measurement.readySize.confirmedAt = new Date();
  }

  await measurement.save();

  const project = await ProjectModel.findById(measurement.project).lean();
  return readySizeLine(measurement.toObject(), project?.consumptionConfig);
};

/** Bulk sign-off for the common case: the whole sheet is right as derived. */
const confirmAllReadySizes = async (projectId, note, user) => {
  const project = await ProjectModel.findById(projectId).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const measurements = await MeasurementModel.find({ project: projectId });
  if (!measurements.length) {
    throw ApiError.workflow('There are no measured windows on this project to sign off');
  }

  const skipped = [];
  let confirmed = 0;

  for (const measurement of measurements) {
    const line = calculateWindow(measurement.toObject(), project.consumptionConfig);

    if (!(line.readyWidthInch > 0) || !(line.readyHeightInch > 0)) {
      skipped.push({ id: String(measurement._id), label: measurement.label, reason: 'No usable measurement' });
      continue;
    }
    if (measurement.readySize?.confirmed) continue;

    measurement.readySize.confirmed = true;
    measurement.readySize.confirmedBy = user?.id;
    measurement.readySize.confirmedAt = new Date();
    if (note) measurement.readySize.note = note;
    confirmed += 1;
  }

  await Promise.all(measurements.filter((m) => m.isModified()).map((m) => m.save()));

  return { confirmed, skipped, total: measurements.length };
};

/** The gate answer: is every window on this project cleared for cutting? */
const readySizeStatus = async (projectId) => {
  const project = await ProjectModel.findById(projectId).lean();
  const measurements = await MeasurementModel.find({ project: projectId }).lean();

  const pending = measurements.filter((m) => {
    const line = calculateWindow(m, project?.consumptionConfig);
    return !line.readySizeConfirmed;
  });

  return { total: measurements.length, pending: pending.length, pendingWindows: pending };
};

export { readySizeSheet, setReadySize, confirmAllReadySizes, readySizeStatus, readySizeLine };

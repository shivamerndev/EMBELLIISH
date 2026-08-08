import {
  PARTICULAR,
  PARTICULAR_LABELS,
  DRAPE_PARTICULARS,
  BLIND_PARTICULARS,
  BLACKOUT_PARTICULARS,
} from '../constants/product.constants.js';

/**
 * Step 6 — the Consumption Sheet.
 *
 * This module is the calculation brain of the ERP: window measurements in, material
 * quantities out. It is deliberately pure (no database, no I/O) so the numbers can be
 * unit-tested and re-derived at any time from the stored measurements.
 *
 * Formulas were reverse-engineered from the signed Embellish consumption sheet in
 * `docs/Cunsumption_Sheet.jpeg` (Mr. Hiral — Bunglow 1, 09.04.2026) and verified
 * against its printed row values and column totals:
 *
 *   Running feet   Rnft            = ceil(width_inch / 12)
 *                                     236.2" -> 20, 143.6" -> 12, 157.5" -> 14,
 *                                     179.8" -> 15, 283.9" -> 24, 300" -> 25
 *                                     (sheet total 142.00 rnft reproduces exactly)
 *
 *   Height/part    Ht. Per Part(m) = (height_inch + hem&heading allowance) * 0.0254
 *                                     121.9" -> 3.40, 122.4" -> 3.41, 116.4" -> 3.26,
 *                                     103.3" -> 2.93   (allowance = 12")
 *
 *   Panels         Total Parts     = width_inch * fullness / usable fabric width
 *                                     236.2" @ 2.5x / 49" -> 12.05
 *                  Rd off / PARTS  = round(Total Parts), overridable by the
 *                                     coordinator (a sheer is often forced to match
 *                                     its main curtain's panel count)
 *
 *   Drape metres   Mtrs Drapes     = Rd off parts * Ht. Per Part
 *                                     12 x 3.4009 -> 40.81, 15 x 2.9286 -> 43.93
 *
 *   Blind area     Roman Sqft      = ceil(width * height / 144)
 *                                     48"x120" -> 40, 33.4"x103.3" -> 24
 *                                     (sheet total 190.00 sqft reproduces exactly)
 *
 * Every coefficient below is a default, not a constant: fullness, fabric width and
 * allowances travel with the fabric or the individual window, because the sheet
 * itself shows different bolt widths in use across rooms.
 */

const INCHES_PER_METER = 39.3701;
const INCHES_PER_FOOT = 12;
const SQ_INCHES_PER_SQ_FOOT = 144;

const DEFAULT_CONSUMPTION_CONFIG = {
  /**
   * Step 4 — Ready Size allowances, in inches.
   *
   * The window is 10 feet; the curtain has to touch the floor, so the finished
   * piece is 10.5. The measured opening and the size the factory stitches to are
   * two different numbers, and confusing them is the single most expensive
   * mistake this company makes. So the allowance is explicit and configurable,
   * and the derived ready size is stored alongside the window size rather than
   * being recomputed differently by whoever needs it next.
   *
   * The defaults are zero because the surveyor on the reference sheet already
   * recorded finished drops. A project that measures to the opening instead sets
   * these once on its own consumption config.
   */
  readyWidthAllowanceInch: 0,
  readyDropAllowanceInch: 0,
  romanReadyWidthAllowanceInch: 0,
  romanReadyDropAllowanceInch: 0,

  /** Gather ratio. 2.5x is the Embellish house standard for main drapes. */
  fullness: 2.5,
  sheerFullness: 2.5,
  /** Roman blinds are flat, not gathered. */
  romanFullness: 1,
  /** Usable width of a fabric bolt after selvedge and side hems, in inches. */
  fabricWidthInch: 50,
  romanFabricWidthInch: 45,
  /** Added to the finished drop to cover bottom hem + heading tape, in inches. */
  heightAllowanceInch: 12,
  romanHeightAllowanceInch: 10,
  /** Extra metres per panel for pattern repeat matching. */
  patternRepeatAllowanceM: 0,
  /** Wastage applied to the final rounded-off drape metres. */
  wastagePercent: 0,
};

/** Rate card. Prices reproduce the FIXED COST block of the reference sheet. */
const DEFAULT_RATE_CARD = {
  blackoutFabricRate: 395, // per metre
  curtainStitchingRate: 1350, // per running foot
  leadBandRate: 125, // per running foot
  romanStitchingRate: 500, // per sq ft
  defaultFabricRate: 0, // set from the chosen fabric
  motorRate: 0,
  trackRate: 0, // per running foot
  installationRate: 0, // per running foot
  gstPercent: 18,
};

/* ------------------------------------------------------------------ helpers */

const round = (value, dp = 2) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** dp;
  // The epsilon nudge keeps 1.005 from landing on 1.00 through binary float error.
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** Fabric is cut in half-metre increments; round up to the next half. */
const ceilToHalf = (value) => round(Math.ceil(round(value, 4) * 2) / 2, 2);

/** Lining is bought to the nearest half metre. */
const roundToHalf = (value) => round(Math.round(round(value, 4) * 2) / 2, 2);

const inchToMeter = (inches) => inches / INCHES_PER_METER;

const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const isDrape = (particular) => DRAPE_PARTICULARS.includes(particular);
const isBlind = (particular) => BLIND_PARTICULARS.includes(particular);
const takesBlackout = (particular) => BLACKOUT_PARTICULARS.includes(particular);

/* --------------------------------------------------------------- line maths */

/**
 * Chooses the width/height actually used for consumption.
 *
 * The sheet carries two measurement systems per window: O2O (outside-to-outside,
 * the pelmet/track span) and F2F (face-to-face, the recess). O2O is the primary
 * column; F2F is filled in when a curtain runs inside a recess instead. We prefer
 * whichever the surveyor actually recorded, O2O first.
 */
const resolveDimensions = (window = {}) => {
  const o2o = window.o2o || {};
  const f2f = window.f2f || {};

  const width = num(o2o.width) > 0 ? num(o2o.width) : num(f2f.width);
  const height = num(o2o.height) > 0 ? num(o2o.height) : num(f2f.height);
  const basis = num(o2o.width) > 0 ? 'O2O' : 'F2F';

  return { width, height, basis };
};

const resolveConfig = (window = {}, config = {}) => {
  const merged = { ...DEFAULT_CONSUMPTION_CONFIG, ...config };
  const roman = isBlind(window.particular);
  const sheer = window.particular === PARTICULAR.SHEER_CURTAIN;

  let fullness = roman ? merged.romanFullness : merged.fullness;
  if (sheer) fullness = merged.sheerFullness;

  return {
    ...merged,
    // Per-window overrides win: the sheet shows bolt width varying room to room.
    fullness: num(window.fullness, fullness) || fullness,
    fabricWidthInch:
      num(window.fabricWidthInch, roman ? merged.romanFabricWidthInch : merged.fabricWidthInch) ||
      merged.fabricWidthInch,
    heightAllowanceInch: num(
      window.heightAllowanceInch,
      roman ? merged.romanHeightAllowanceInch : merged.heightAllowanceInch
    ),
    readyWidthAllowanceInch: num(
      window.readySize?.widthAllowanceInch,
      roman ? merged.romanReadyWidthAllowanceInch : merged.readyWidthAllowanceInch
    ),
    readyDropAllowanceInch: num(
      window.readySize?.dropAllowanceInch,
      roman ? merged.romanReadyDropAllowanceInch : merged.readyDropAllowanceInch
    ),
  };
};

/**
 * Step 4 — Ready Size.
 *
 * The finished size of the piece, which is what the factory stitches to and what
 * QC measures against. Derived from the window size plus the ready allowances,
 * unless the coordinator typed an explicit finished size — a bay window, a
 * pelmet return or a client who wants the drape stopping at the sill are all
 * cases the arithmetic cannot know about.
 *
 * Everything downstream (panels, fabric metres, blind area, stitching feet) is
 * computed from the ready size, never from the raw opening.
 */
const resolveReadySize = (window = {}, cfg = {}, windowWidth = 0, windowHeight = 0) => {
  const manual = window.readySize || {};
  const manualWidth = num(manual.widthInch);
  const manualHeight = num(manual.heightInch);

  const derivedWidth = windowWidth > 0 ? round(windowWidth + num(cfg.readyWidthAllowanceInch), 2) : 0;
  const derivedHeight = windowHeight > 0 ? round(windowHeight + num(cfg.readyDropAllowanceInch), 2) : 0;

  const overridden = manualWidth > 0 || manualHeight > 0;

  return {
    widthInch: manualWidth > 0 ? round(manualWidth, 2) : derivedWidth,
    heightInch: manualHeight > 0 ? round(manualHeight, 2) : derivedHeight,
    derivedWidthInch: derivedWidth,
    derivedHeightInch: derivedHeight,
    widthAllowanceInch: num(cfg.readyWidthAllowanceInch),
    dropAllowanceInch: num(cfg.readyDropAllowanceInch),
    source: overridden ? 'MANUAL' : 'DERIVED',
    confirmed: Boolean(manual.confirmed),
    confirmedAt: manual.confirmedAt || null,
    note: manual.note || '',
  };
};

/**
 * Calculates the consumption for a single window line.
 *
 * @param {object} window measurement line (particular, o2o, f2f, pelmet, wire, …)
 * @param {object} config project-level consumption configuration
 * @returns {object} the full computed row, shaped like the paper sheet
 */
const calculateWindow = (window = {}, config = {}) => {
  const particular = window.particular || PARTICULAR.MAIN_CURTAIN;
  const cfg = resolveConfig({ ...window, particular }, config);
  const { width: windowWidth, height: windowHeight, basis } = resolveDimensions(window);

  // Step 4: everything below is computed from the *finished* size, not the opening.
  const ready = resolveReadySize(window, cfg, windowWidth, windowHeight);
  const width = ready.widthInch;
  const height = ready.heightInch;

  const drape = isDrape(particular);
  const blind = isBlind(particular);

  // --- Running feet: what stitching, lead band, track and installation are billed on.
  const rnft = drape ? (width > 0 ? Math.ceil(width / INCHES_PER_FOOT) : 0) : 0;

  // --- Height of one fabric panel, in metres, including hem and heading.
  const heightPerPartM = height > 0 ? round(inchToMeter(height + cfg.heightAllowanceInch) + cfg.patternRepeatAllowanceM, 4) : 0;

  // --- How many fabric panels the gathered width needs.
  const totalParts = width > 0 && cfg.fabricWidthInch > 0
    ? round((width * cfg.fullness) / cfg.fabricWidthInch, 2)
    : 0;

  // The coordinator can force the panel count (e.g. to pair a sheer with its main).
  const suggestedParts = totalParts > 0 ? Math.max(1, Math.round(totalParts)) : 0;
  const roundedParts = Number.isFinite(Number(window.partsOverride)) && Number(window.partsOverride) > 0
    ? Math.round(Number(window.partsOverride))
    : suggestedParts;

  // --- Fabric. (Wooden blinds are hard window coverings, not fabric drapes)
  const isFabricProduct = drape || particular === PARTICULAR.ROMAN_BLIND;
  const rawDrapeMeters = isFabricProduct ? round(roundedParts * heightPerPartM, 2) : 0;
  const wastage = rawDrapeMeters * (cfg.wastagePercent / 100);
  const fabricMeters = rawDrapeMeters > 0 ? ceilToHalf(rawDrapeMeters + wastage) : 0;

  // --- Blackout lining: main/motorised drapes only. A sheer is meant to let light in.
  const blackoutMeters = takesBlackout(particular) && rawDrapeMeters > 0
    ? roundToHalf(rawDrapeMeters)
    : 0;

  // --- Blind area.
  const romanSqft = blind && width > 0 && height > 0
    ? Math.ceil((width * height) / SQ_INCHES_PER_SQ_FOOT)
    : 0;

  // --- Labour and hardware quantities.
  const stitchingRnft = drape ? rnft : 0;
  const leadBandRnft = drape ? rnft : 0;
  const romanStitchingSqft = romanSqft;

  const wire = window.wire || {};
  const wireRnft = drape && (wire.left || wire.right)
    ? round(((wire.left ? 1 : 0) + (wire.right ? 1 : 0)) * (num(window.wireDropFt) || num(height) / INCHES_PER_FOOT), 2)
    : 0;

  const trackRnft = window.motorRequired || drape ? rnft : 0;
  const motorQty = window.motorRequired ? num(window.motorQty, 1) || 1 : 0;

  const pelmet = window.pelmet || {};
  const pelmetRnft = num(pelmet.o2oWidth) > 0 || num(pelmet.f2fWidth) > 0 ? rnft : 0;

  return {
    particular,
    particularLabel: PARTICULAR_LABELS[particular] || particular,
    basis,

    // --- Step 4: the two sizes, kept apart on purpose.
    /** What was measured at site. */
    windowWidthInch: round(windowWidth, 2),
    windowHeightInch: round(windowHeight, 2),
    /** What the factory stitches to, and what QC measures against. */
    readyWidthInch: ready.widthInch,
    readyHeightInch: ready.heightInch,
    readySizeSource: ready.source,
    readySizeConfirmed: ready.confirmed,
    readySizeNote: ready.note,
    readyWidthAllowanceInch: ready.widthAllowanceInch,
    readyDropAllowanceInch: ready.dropAllowanceInch,
    /** `width`/`height` are the ready size — every quantity below is derived from them. */
    width: round(width, 2),
    height: round(height, 2),

    rnft,
    totalParts,
    suggestedParts,
    roundedParts,
    partsOverridden: roundedParts !== suggestedParts,
    heightPerPartM: round(heightPerPartM, 2),

    drapeMeters: round(rawDrapeMeters, 2),
    fabricMeters,
    blackoutMeters,
    romanSqft,

    stitchingRnft,
    leadBandRnft,
    romanStitchingSqft,
    wireRnft,
    trackRnft,
    pelmetRnft,
    motorQty,

    config: {
      fullness: cfg.fullness,
      fabricWidthInch: cfg.fabricWidthInch,
      heightAllowanceInch: cfg.heightAllowanceInch,
      readyWidthAllowanceInch: cfg.readyWidthAllowanceInch,
      readyDropAllowanceInch: cfg.readyDropAllowanceInch,
    },
  };
};

/* --------------------------------------------------------------- aggregation */

const EMPTY_TOTALS = {
  rnft: 0,
  fabricMeters: 0,
  blackoutMeters: 0,
  romanSqft: 0,
  stitchingRnft: 0,
  leadBandRnft: 0,
  romanStitchingSqft: 0,
  wireRnft: 0,
  trackRnft: 0,
  pelmetRnft: 0,
  motorQty: 0,
  parts: 0,
};

const addTotals = (totals, line) => ({
  rnft: totals.rnft + line.rnft,
  fabricMeters: totals.fabricMeters + line.fabricMeters,
  blackoutMeters: totals.blackoutMeters + line.blackoutMeters,
  romanSqft: totals.romanSqft + line.romanSqft,
  stitchingRnft: totals.stitchingRnft + line.stitchingRnft,
  leadBandRnft: totals.leadBandRnft + line.leadBandRnft,
  romanStitchingSqft: totals.romanStitchingSqft + line.romanStitchingSqft,
  wireRnft: totals.wireRnft + line.wireRnft,
  trackRnft: totals.trackRnft + line.trackRnft,
  pelmetRnft: totals.pelmetRnft + line.pelmetRnft,
  motorQty: totals.motorQty + line.motorQty,
  parts: totals.parts + line.roundedParts,
});

const roundTotals = (totals) =>
  Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value, 2)]));

/**
 * Builds the whole consumption sheet: every window, grouped into rooms, with
 * room subtotals and a project grand total — exactly the shape of the paper sheet.
 *
 * @param {Array} windows measurement lines, each carrying `room` and `roomName`
 * @param {object} config project consumption configuration
 */
const buildConsumptionSheet = (windows = [], config = {}) => {
  const roomMap = new Map();
  let grandTotals = { ...EMPTY_TOTALS };

  windows.forEach((window, index) => {
    const line = calculateWindow(window, config);

    const enriched = {
      ...line,
      sr: index + 1,
      window: window._id ? String(window._id) : undefined,
      room: window.room ? String(window.room) : undefined,
      roomName: window.roomName || 'Unassigned',
      floor: window.floor || '',
      windowLabel: window.label || `Window ${index + 1}`,
      motorRequired: Boolean(window.motorRequired),
      fabric: window.fabric ? String(window.fabric) : undefined,
      fabricName: window.fabricName || '',
      o2o: window.o2o || { width: line.basis === 'O2O' ? line.windowWidthInch : null, height: line.basis === 'O2O' ? line.windowHeightInch : null },
      f2f: window.f2f || { width: line.basis === 'F2F' ? line.windowWidthInch : null, height: line.basis === 'F2F' ? line.windowHeightInch : null },
      pelmet: window.pelmet || null,
      wire: window.wire || null,
    };

    const key = enriched.room || enriched.roomName;
    if (!roomMap.has(key)) {
      roomMap.set(key, {
        room: enriched.room,
        roomName: enriched.roomName,
        floor: enriched.floor,
        lines: [],
        totals: { ...EMPTY_TOTALS },
      });
    }

    const room = roomMap.get(key);
    room.lines.push(enriched);
    room.totals = addTotals(room.totals, enriched);
    grandTotals = addTotals(grandTotals, enriched);
  });

  const rooms = [...roomMap.values()].map((room) => ({
    ...room,
    totals: roundTotals(room.totals),
  }));

  const lines = rooms.flatMap((room) => room.lines);

  return {
    rooms,
    lines,
    totals: roundTotals(grandTotals),
    config: { ...DEFAULT_CONSUMPTION_CONFIG, ...config },
    /** Step 4 roll-up: what is still waiting on a ready-size sign-off. */
    readySize: {
      total: lines.length,
      confirmed: lines.filter((line) => line.readySizeConfirmed).length,
      pending: lines.filter((line) => !line.readySizeConfirmed).length,
      overridden: lines.filter((line) => line.readySizeSource === 'MANUAL').length,
    },
  };
};

/* ------------------------------------------------------------------ costing */

/**
 * Turns consumption totals into priced BOQ lines — the bridge from Step 6 to the
 * Step 8 quotation. Zero-quantity lines are dropped so the document stays readable.
 */
const priceConsumption = (totals, rateCard = {}) => {
  const rates = { ...DEFAULT_RATE_CARD, ...rateCard };

  const candidates = [
    {
      key: 'FABRIC',
      particular: 'Curtain fabric',
      quantity: totals.fabricMeters,
      unit: 'mtr',
      rate: rates.defaultFabricRate,
    },
    {
      key: 'BLACKOUT',
      particular: 'Blackout fabric',
      quantity: totals.blackoutMeters,
      unit: 'mtr',
      rate: rates.blackoutFabricRate,
    },
    {
      key: 'CURTAIN_STITCHING',
      particular: 'Curtain stitching',
      quantity: totals.stitchingRnft,
      unit: 'rnft',
      rate: rates.curtainStitchingRate,
    },
    {
      key: 'LEAD_BAND',
      particular: 'Lead band',
      quantity: totals.leadBandRnft,
      unit: 'rnft',
      rate: rates.leadBandRate,
    },
    {
      key: 'ROMAN_STITCHING',
      particular: 'Roman stitching',
      quantity: totals.romanStitchingSqft,
      unit: 'sqft',
      rate: rates.romanStitchingRate,
    },
    {
      key: 'TRACK',
      particular: 'Track & brackets',
      quantity: totals.trackRnft,
      unit: 'rnft',
      rate: rates.trackRate,
    },
    {
      key: 'MOTOR',
      particular: 'Motor & remote',
      quantity: totals.motorQty,
      unit: 'pcs',
      rate: rates.motorRate,
    },
    {
      key: 'INSTALLATION',
      particular: 'Installation',
      quantity: totals.rnft,
      unit: 'rnft',
      rate: rates.installationRate,
    },
  ];

  const lines = candidates
    .filter((line) => line.quantity > 0 && line.rate > 0)
    .map((line) => ({
      ...line,
      quantity: round(line.quantity, 2),
      amount: round(line.quantity * line.rate, 2),
    }));

  const subtotal = round(lines.reduce((sum, line) => sum + line.amount, 0), 2);
  const gstAmount = round((subtotal * rates.gstPercent) / 100, 2);

  return {
    lines,
    subtotal,
    gstPercent: rates.gstPercent,
    gstAmount,
    grandTotal: round(subtotal + gstAmount, 2),
  };
};

/** Convenience: measurements straight through to a priced sheet. */
const buildPricedSheet = (windows, config = {}, rateCard = {}) => {
  const sheet = buildConsumptionSheet(windows, config);
  return { ...sheet, costing: priceConsumption(sheet.totals, rateCard) };
};

export {
  DEFAULT_CONSUMPTION_CONFIG,
  DEFAULT_RATE_CARD,
  resolveReadySize,
  calculateWindow,
  buildConsumptionSheet,
  priceConsumption,
  buildPricedSheet,
  round,
  ceilToHalf,
  roundToHalf,
};

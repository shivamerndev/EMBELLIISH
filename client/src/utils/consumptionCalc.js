/**
 * Embellish Consumption Calculators : Pure Calculation Engine
 * ============================================================
 * Implements the documented formulas exactly for three calculator types:
 *   1. Curtain Calculator
 *   2. Roman Blind Calculator
 *   3. Wallpaper Calculator
 *
 * Source of truth: docs/EMBELLISH_CONSUMPTION_CALCULATORS_DOCUMENTATION.md
 *
 * Units
 *   - All dimensional inputs expected in INCHES (unless noted)
 *   - Roll length (Wallpaper) expected in METRES (per documentation)
 *   - All final order quantities are in METRES (or rolls for wallpaper)
 *
 * 1 inch = 0.0254 metres | 1 metre = 39.3701 inches
 */

const INCH_TO_METRE = 0.0254;
const METRE_TO_INCH = 39.3701;

// ─── Pure Math Helpers ────────────────────────────────────────────────────────

/** Round val to dp decimal places (standard arithmetic rounding) */
const round = (val, dp = 2) => {
    if (!Number.isFinite(val)) return 0;
    const factor = 10 ** dp;
    return Math.round((val + Number.EPSILON) * factor) / factor;
};

/**
 * Excel CEILING(val, significance): round UP to next multiple of significance.
 * Example: ceiling(13.2, 1) → 14  |  ceiling(112, 16) → 112
 */
const ceiling = (val, significance = 1) => {
    if (!Number.isFinite(val) || !significance) return val;
    return Math.ceil(round(val / significance, 10)) * significance;
};

/**
 * Excel FLOOR(val, significance): round DOWN to nearest multiple.
 * Example: floor(395.6 / 108, 1) → 3
 */
const floorTo = (val, significance = 1) => {
    if (!Number.isFinite(val) || !significance) return val;
    return Math.floor(round(val / significance, 10)) * significance;
};

/**
 * Convert a dimension to inches if entered in another unit (e.g. mm, cm, ft).
 * If unit is unspecified or mm and value > 500, auto-treat as mm (e.g. 1200 mm -> 47.24 in).
 */
const toInches = (val, unit = 'in') => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0) return 0;
    const u = String(unit || '').toLowerCase();
    if (u === 'mm') return num / 25.4;
    if (u === 'cm') return num / 2.54;
    if (u === 'ft') return num * 12;
    if (num > 500) return num / 25.4;
    return num;
};

// ─── Auto Safety Lookup Table ─────────────────────────────────────────────────
// Documentation: "Smart rule based on track width" : exact values not published.
// These are industry-standard placeholder values. Update to match client specs.
// Each entry: if trackWidth < maxWidth → use safety inches value.
const AUTO_SAFETY_BRACKETS = [
    { maxWidth: 60, safety: 2 },
    { maxWidth: 100, safety: 3 },
    { maxWidth: 150, safety: 4 },
    { maxWidth: 200, safety: 5 },
    { maxWidth: 250, safety: 6 },
    { maxWidth: Infinity, safety: 8 },
];

const getAutoSafety = (trackWidthInch) => {
    if (!trackWidthInch || trackWidthInch <= 0) return 0;
    const bracket = AUTO_SAFETY_BRACKETS.find((b) => trackWidthInch < b.maxWidth);
    return bracket ? bracket.safety : 8;
};

// ─── Repeat-Adjusted Cut Drop (shared by Curtain & Roman Blind) ───────────────

/**
 * IF verticalRepeat = 0: repeatCutDrop = rawCutDrop
 * ELSE:  repeatCutDrop = CEILING(rawCutDrop / verticalRepeat) × verticalRepeat
 */
const applyRepeat = (rawCutDrop, verticalRepeat) => {
    if (verticalRepeat > 0) {
        return ceiling(rawCutDrop / verticalRepeat) * verticalRepeat;
    }
    return rawCutDrop;
};

// ─── Cutting Instruction Builders ─────────────────────────────────────────────

const curtainInstruction = ({ numWidths, repeatCutDrop, qty }) =>
    numWidths && repeatCutDrop && qty
        ? `${numWidths} width(s) × ${round(repeatCutDrop, 1)}" drop × ${qty} set(s)`
        : '';

const romanInstruction = ({ isRailroaded, rawCutDrop, usableWidthApplied, railroadRunningWidth, numWidths, repeatCutDrop, qty }) => {
    if (isRailroaded) {
        if (rawCutDrop <= usableWidthApplied) {
            return `${round(railroadRunningWidth, 1)} in running width x ${qty} blind(s) - railroaded`;
        }
        return 'CANNOT RAILROAD AT THIS HEIGHT';
    }
    return numWidths && repeatCutDrop && qty
        ? `${numWidths} width(s) x ${round(repeatCutDrop, 1)} in x ${qty} blind(s)`
        : '';
};

const wallpaperInstruction = ({ requiredStrips, adjustedStripLength, qty }) =>
    requiredStrips && adjustedStripLength
        ? `${requiredStrips} strip(s) × ${round(adjustedStripLength, 1)}" length × ${qty || 1} wall(s)`
        : '';

// ─── EMPTY / ZERO RESULT TEMPLATES ───────────────────────────────────────────

const EMPTY_CURTAIN = {
    valid: false,
    autoSafety: 0, effectiveWidth: 0, flatFabricWidth: 0, usableWidthApplied: 0,
    numWidths: 0, rawCutDrop: 0, repeatCutDrop: 0, rawMetres: 0,
    netMetres: 0, orderMetres: 0,
    railroadCheck: '—', cuttingInstruction: '',
    // backward-compat aliases
    heightPerPartM: 0, roundedParts: 0, fabricMeters: 0, blackoutMeters: 0, romanSqft: 0,
};

const EMPTY_ROMAN = {
    valid: false,
    requiredCutWidth: 0, rawCutDrop: 0, repeatCutDrop: 0, railroadRunningWidth: 0, numWidths: 0,
    rawMetres: 0, netMetres: 0, orderMetres: 0,
    railroadCheck: '—', cuttingInstruction: '',
    // backward-compat aliases
    heightPerPartM: 0, roundedParts: 0, fabricMeters: 0, blackoutMeters: 0, romanSqft: 0,
};

const EMPTY_WALLPAPER = {
    valid: false,
    rawCutDrop: 0, adjustedStripLength: 0, stripsPerWall: 0,
    requiredStrips: 0, stripsPerRoll: 0, requiredMetres: 0,
    baseRolls: 0, finalOrderMetres: 0, finalOrderRolls: 0,
    finalOrderQuantity: 0, orderUnit: 'Metres',
    orderCheck: '—', cuttingInstruction: '',
    // backward-compat aliases
    heightPerPartM: 0, roundedParts: 0, fabricMeters: 0, blackoutMeters: 0, romanSqft: 0,
};

// ─── 1. CURTAIN CALCULATOR ─────────────────────────────────────────────────────
/**
 * Calculates fabric consumption for curtains.
 *
 * Required row fields (all in inches unless noted):
 *   qty            : Number of identical curtain sets (integer ≥ 1)
 *   trackWidth     : Track width in inches
 *   finishedDrop   : Finished drop in inches
 *   fabricWidth    : Fabric roll width in inches
 *   usableWidth    : Usable width after selvedge; 0 → use fabricWidth
 *   verticalRepeat : Pattern repeat height; 0 → no repeat
 *   fullness       : Fullness ratio (e.g. 2.5)
 *   leftReturn     : Left wall return in inches
 *   rightReturn    : Right wall return in inches
 *   centreOverlap  : Centre overlap in inches
 *   topAllowance   : Top heading allowance in inches
 *   bottomHem      : Bottom hem allowance in inches
 *   wastage        : Wastage ratio (e.g. 0.03 = 3%)
 *   orderIncrement : Order rounding increment in metres (e.g. 0.5)
 *   pleatByDesign  : 'Yes' / 'No' : adds 20% when Yes
 *   fabricDirection : 'Normal' / 'Railroaded'
 */
export function calculateCurtainConsumption(row = {}) {
    const qty = Math.max(1, Number(row.qty ?? row.quantity) || 1);

    const rawTrackWidth = row.trackWidth !== undefined && row.trackWidth !== '' && row.trackWidth !== null
        ? Number(row.trackWidth)
        : Number(row.outToOutWidth ?? row.o2oWidth ?? row.frameToFrameWidth ?? row.f2fWidth ?? row.confirmedWidth ?? row.width);

    const rawFinishedDrop = row.finishedDrop !== undefined && row.finishedDrop !== '' && row.finishedDrop !== null
        ? Number(row.finishedDrop)
        : Number(row.outToOutHeight ?? row.o2oHeight ?? row.frameToFrameHeight ?? row.f2fHeight ?? row.confirmedHeight ?? row.height);

    if (!Number.isFinite(rawTrackWidth) || rawTrackWidth <= 0 || !Number.isFinite(rawFinishedDrop) || rawFinishedDrop <= 0) {
        return EMPTY_CURTAIN;
    }

    // Determine unit mode: if > 200, values are in millimetres (standard architectural/window measurements)
    const isMillimetres = rawTrackWidth > 200 || rawFinishedDrop > 200;

    const trackWidthM = isMillimetres ? rawTrackWidth / 1000 : (rawTrackWidth > 10 ? rawTrackWidth * 0.0254 : rawTrackWidth);
    const finishedDropM = isMillimetres ? rawFinishedDrop / 1000 : (rawFinishedDrop > 10 ? rawFinishedDrop * 0.0254 : rawFinishedDrop);

    // Fabric width: entered in cm (e.g. 138), mm, or metres
    const rawFabricWidth = Number(row.fabricWidth) || 138;
    const fabricWidthM = rawFabricWidth > 10
        ? (rawFabricWidth > 300 ? rawFabricWidth / 1000 : (rawFabricWidth < 100 ? rawFabricWidth * 0.0254 : rawFabricWidth / 100))
        : (rawFabricWidth > 0 ? rawFabricWidth : 1.38);

    // Usable width: entered in cm (e.g. 136)
    const rawUsableWidth = Number(row.usableWidth) || 0;
    const usableWidthM = rawUsableWidth > 0
        ? (rawUsableWidth > 10 ? (rawUsableWidth > 300 ? rawUsableWidth / 1000 : (rawUsableWidth < 100 ? rawUsableWidth * 0.0254 : rawUsableWidth / 100)) : rawUsableWidth)
        : fabricWidthM;

    // Vertical repeat: entered in cm (e.g. 74)
    const rawRepeat = Number(row.verticalRepeat) || 0;
    const verticalRepeatM = rawRepeat > 0
        ? (rawRepeat > 10 ? (rawRepeat > 300 ? rawRepeat / 1000 : (rawRepeat < 100 ? rawRepeat * 0.0254 : rawRepeat / 100)) : rawRepeat)
        : 0;

    const fullness = Number(row.fullness) || 2;

    const normalizeAllowance = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        const n = Number(val);
        if (!Number.isFinite(n)) return 0;
        return n > 5 ? n / 1000 : n;
    };

    const leftReturn = normalizeAllowance(row.leftReturn ?? row.curtainReturnLeft);
    const rightReturn = normalizeAllowance(row.rightReturn ?? row.curtainReturnRight);
    const centreOverlap = normalizeAllowance(row.centreOverlap);
    const topAllowance = normalizeAllowance(row.topAllowance);
    const bottomHem = row.bottomHem !== undefined && row.bottomHem !== '' ? normalizeAllowance(row.bottomHem) : 0.2;

    const rawWastage = Number(row.wastage);
    const wastage = Number.isFinite(rawWastage) ? (rawWastage > 1 ? rawWastage / 100 : rawWastage) : 0.05;

    const orderIncrement = Number(row.orderIncrement) || 0.1;
    const pleatByDesign = String(row.pleatByDesign || row.pleatingByDesign || 'No').toLowerCase() === 'yes';
    const fabricDirection = String(row.fabricDirection || 'Normal').toLowerCase();
    const isRailroaded = fabricDirection === 'railroaded';
    const autoSafety = normalizeAllowance(row.autoSafety);

    // Effective Width (m)
    const effectiveWidth = trackWidthM + leftReturn + rightReturn + centreOverlap + autoSafety;

    // Flat Fabric Width (m)
    const flatFabricWidth = effectiveWidth * fullness;

    // Usable Width Applied (m)
    const usableWidthApplied = usableWidthM > 0 ? usableWidthM : fabricWidthM;

    // Number of Widths: ROUND to nearest integer
    const pleatMult = pleatByDesign ? 1.2 : 1;
    const rawWidths = (flatFabricWidth / usableWidthApplied) * pleatMult;
    const numWidths = Math.round(rawWidths);

    // Raw Cut Drop (m)
    const rawCutDrop = finishedDropM + topAllowance + bottomHem;

    // Repeat-Adjusted Cut Drop (m)
    const repeatCutDrop = verticalRepeatM > 0 ? ceiling(rawCutDrop / verticalRepeatM) * verticalRepeatM : rawCutDrop;

    // Railroad Check
    let railroadCheck = 'Not applicable';
    if (isRailroaded) {
        railroadCheck = repeatCutDrop <= usableWidthApplied
            ? 'OK to railroad'
            : 'Cannot railroad at this height';
    }

    // Raw Metres
    let rawMetres = 0;
    if (isRailroaded) {
        if (repeatCutDrop <= usableWidthApplied) {
            rawMetres = flatFabricWidth * pleatMult * qty;
        }
    } else {
        rawMetres = numWidths * repeatCutDrop * qty;
    }

    // Net Metres
    const netMetres = rawMetres * (1 + wastage);

    // Order Metres: CEILING(netMetres / orderIncrement) * orderIncrement
    const orderMetres = orderIncrement > 0
        ? ceiling(netMetres / orderIncrement) * orderIncrement
        : round(netMetres, 2);

    // Cutting Instruction
    const cuttingInstruction = `${numWidths} width(s) × ${round(repeatCutDrop, 2)}m drop × ${qty} set(s)`;

    return {
        valid: true,
        autoSafety: round(autoSafety, 2),
        effectiveWidth: round(effectiveWidth, 2),
        flatFabricWidth: round(flatFabricWidth, 2),
        usableWidthApplied: round(usableWidthApplied, 2),
        numWidths,
        rawCutDrop: round(rawCutDrop, 2),
        repeatCutDrop: round(repeatCutDrop, 2),
        rawMetres: round(rawMetres, 2),
        netMetres: round(netMetres, 2),
        orderMetres: round(orderMetres, 2),
        railroadCheck,
        cuttingInstruction,
        // backward-compat aliases (used by grid totals aggregation)
        heightPerPartM: round(repeatCutDrop, 2),
        roundedParts: numWidths,
        fabricMeters: round(orderMetres, 2),
        blackoutMeters: 0,
    };
}

// ─── 2. ROMAN BLIND CALCULATOR ────────────────────────────────────────────────
/**
 * Calculates fabric consumption for Roman blinds.
 *
 * Required row fields (all in inches):
 *   qty              : Number of identical blinds (integer ≥ 1)
 *   blindWidth       : Finished blind width in inches
 *   blindDrop        : Finished blind drop in inches
 *   fabricWidth      : Fabric roll width in inches
 *   usableWidth      : Usable width after selvedge
 *   verticalRepeat   : Pattern repeat height; 0 → no repeat
 *   leftAllowance    : Left mounting allowance
 *   rightAllowance   : Right mounting allowance
 *   topAllowance     : Top mounting allowance
 *   bottomAllowance  : Bottom hem allowance
 *   wastage          : Wastage ratio (e.g. 0.03)
 *   orderIncrement   : Order rounding increment in metres
 *   fabricDirection  : 'Normal' / 'Railroaded'
 */
export function calculateRomanBlindConsumption(row = {}) {
    const qty = Math.max(1, Number(row.qty ?? row.quantity) || 1);

    const rawBlindWidth = row.blindWidth !== undefined && row.blindWidth !== '' && row.blindWidth !== null
        ? Number(row.blindWidth)
        : (row.finishedBlindWidth !== undefined && row.finishedBlindWidth !== '' && row.finishedBlindWidth !== null
            ? Number(row.finishedBlindWidth)
            : toInches(row.outToOutWidth ?? row.o2oWidth ?? row.frameToFrameWidth ?? row.f2fWidth ?? row.confirmedWidth ?? row.width, row.unit));
    const blindWidthInch = Number.isFinite(rawBlindWidth) ? (rawBlindWidth > 200 ? rawBlindWidth / 25.4 : rawBlindWidth) : 0;

    const rawBlindDrop = row.blindDrop !== undefined && row.blindDrop !== '' && row.blindDrop !== null
        ? Number(row.blindDrop)
        : (row.finishedBlindDrop !== undefined && row.finishedBlindDrop !== '' && row.finishedBlindDrop !== null
            ? Number(row.finishedBlindDrop)
            : toInches(row.outToOutHeight ?? row.o2oHeight ?? row.frameToFrameHeight ?? row.f2fHeight ?? row.confirmedHeight ?? row.height, row.unit));
    const blindDropInch = Number.isFinite(rawBlindDrop) ? (rawBlindDrop > 200 ? rawBlindDrop / 25.4 : rawBlindDrop) : 0;

    const fabricWidthInch = row.fabricWidth !== undefined && row.fabricWidth !== '' && row.fabricWidth !== null
        ? Number(row.fabricWidth)
        : 54;
    const usableWidthRaw = row.usableWidth !== undefined && row.usableWidth !== '' && row.usableWidth !== null
        ? Number(row.usableWidth)
        : 52;
    const verticalRepeat = Number(row.verticalRepeat) || 0;
    const leftAllowance = row.leftAllowance !== undefined && row.leftAllowance !== '' && row.leftAllowance !== null
        ? Number(row.leftAllowance)
        : 2;
    const rightAllowance = row.rightAllowance !== undefined && row.rightAllowance !== '' && row.rightAllowance !== null
        ? Number(row.rightAllowance)
        : 2;
    const topAllowance = row.topAllowance !== undefined && row.topAllowance !== '' && row.topAllowance !== null
        ? Number(row.topAllowance)
        : 4;
    const bottomAllowance = row.bottomAllowance !== undefined && row.bottomAllowance !== '' && row.bottomAllowance !== null
        ? Number(row.bottomAllowance)
        : 8;
    const rawWastage = row.wastage !== undefined && row.wastage !== '' && row.wastage !== null ? Number(row.wastage) : 0;
    const wastage = Number.isFinite(rawWastage) ? (rawWastage > 1 ? rawWastage / 100 : rawWastage) : 0;
    const orderIncrement = row.orderIncrement !== undefined && row.orderIncrement !== '' && row.orderIncrement !== null ? Number(row.orderIncrement) : 0.5;
    const fabricDirection = String(row.fabricDirection || 'Normal').toLowerCase();
    const isRailroaded = fabricDirection === 'railroaded';

    const hasManualInputs = (
        (row.requiredCutWidth !== undefined && row.requiredCutWidth !== '' && row.requiredCutWidth !== null) ||
        (row.rawCutDrop !== undefined && row.rawCutDrop !== '' && row.rawCutDrop !== null) ||
        (row.repeatCutDrop !== undefined && row.repeatCutDrop !== '' && row.repeatCutDrop !== null) ||
        (row.railroadRunningWidth !== undefined && row.railroadRunningWidth !== '' && row.railroadRunningWidth !== null) ||
        (row.numWidths !== undefined && row.numWidths !== '' && row.numWidths !== null) ||
        (row.rawMetres !== undefined && row.rawMetres !== '' && row.rawMetres !== null) ||
        (row.netMetres !== undefined && row.netMetres !== '' && row.netMetres !== null)
    );

    if (!hasManualInputs && (blindWidthInch <= 0 || blindDropInch <= 0 || fabricWidthInch <= 0)) {
        return {
            ...EMPTY_ROMAN,
            railroadRunningWidth: 0,
        };
    }

    // Effective usable width
    const usableWidthApplied = usableWidthRaw > 0 ? usableWidthRaw : fabricWidthInch;

    // Required Cut Width: Finished Blind Width + Left Allowance + Right Allowance (or manual override)
    const requiredCutWidth = (row.requiredCutWidth !== undefined && row.requiredCutWidth !== '' && row.requiredCutWidth !== null)
        ? Number(row.requiredCutWidth)
        : (blindWidthInch > 0 ? blindWidthInch + leftAllowance + rightAllowance : 0);

    // Raw Cut Drop: Finished Blind Drop + Top Allowance + Bottom Allowance (or manual override)
    const rawCutDrop = (row.rawCutDrop !== undefined && row.rawCutDrop !== '' && row.rawCutDrop !== null)
        ? Number(row.rawCutDrop)
        : (blindDropInch > 0 ? blindDropInch + topAllowance + bottomAllowance : 0);

    // Repeat-Adjusted Cut Drop (same rule as curtain) (or manual override)
    const repeatCutDrop = (row.repeatCutDrop !== undefined && row.repeatCutDrop !== '' && row.repeatCutDrop !== null)
        ? Number(row.repeatCutDrop)
        : applyRepeat(rawCutDrop, verticalRepeat);

    // Railroad Running Width (AG12: IF(OR(AD12="",AC12<>"Railroaded"),"",IF(V12>0,CEILING(AD12/V12,1)*V12,AD12))) (or manual override)
    const railroadRunningWidth = (row.railroadRunningWidth !== undefined && row.railroadRunningWidth !== '' && row.railroadRunningWidth !== null)
        ? Number(row.railroadRunningWidth)
        : (isRailroaded
            ? (verticalRepeat > 0 ? ceiling(requiredCutWidth / verticalRepeat) * verticalRepeat : requiredCutWidth)
            : 0);

    // Number of Widths : CEILING (AH12: IF(OR(AD12="",AC12<>"Normal",U12<=0),"",CEILING(AD12/U12,1))) (or manual override)
    // Only applies for Normal direction; railroaded blinds run as single continuous width
    const numWidths = (row.numWidths !== undefined && row.numWidths !== '' && row.numWidths !== null)
        ? Number(row.numWidths)
        : ((!isRailroaded && usableWidthApplied > 0 && requiredCutWidth > 0)
            ? Math.ceil(requiredCutWidth / usableWidthApplied)
            : 0);

    // Railroad Check (AL12: IF(R12="","",IF(AC12="Railroaded",IF(AE12<=U12,"OK to railroad","Cannot railroad at this height"),"Not applicable")))
    let railroadCheck = 'Not applicable';
    if (isRailroaded) {
        railroadCheck = rawCutDrop <= usableWidthApplied
            ? 'OK to railroad'
            : 'Cannot railroad at this height';
    }

    // Raw Metres (AI12: IF(AD12="","",IF(AC12="Railroaded",IF(AE12<=U12,AG12*0.0254*Q12,""),AH12*AF12*0.0254*Q12))) (or manual override)
    let rawMetres = 0;
    if (row.rawMetres !== undefined && row.rawMetres !== '' && row.rawMetres !== null) {
        rawMetres = Number(row.rawMetres);
    } else if (isRailroaded) {
        if (rawCutDrop <= usableWidthApplied) {
            rawMetres = railroadRunningWidth * INCH_TO_METRE * qty;
        }
    } else {
        rawMetres = numWidths * repeatCutDrop * INCH_TO_METRE * qty;
    }

    // Net Metres (or manual override)
    const netMetres = (row.netMetres !== undefined && row.netMetres !== '' && row.netMetres !== null)
        ? Number(row.netMetres)
        : rawMetres * (1 + wastage);

    // Order Metres: CEILING(netMetres / orderIncrement) × orderIncrement (or manual override)
    const orderMetres = (row.orderMetres !== undefined && row.orderMetres !== '' && row.orderMetres !== null)
        ? Number(row.orderMetres)
        : (orderIncrement > 0
            ? ceiling(netMetres / orderIncrement) * orderIncrement
            : round(netMetres, 2));

    // Cutting Instruction (AM12)
    const cuttingInstruction = romanInstruction({
        isRailroaded,
        rawCutDrop,
        usableWidthApplied,
        railroadRunningWidth,
        numWidths,
        repeatCutDrop,
        qty,
    });

    return {
        valid: true,
        requiredCutWidth: round(requiredCutWidth, 2),
        usableWidthApplied: round(usableWidthApplied, 2),
        rawCutDrop: round(rawCutDrop, 2),
        repeatCutDrop: round(repeatCutDrop, 2),
        railroadRunningWidth: round(railroadRunningWidth, 2),
        numWidths,
        rawMetres: round(rawMetres, 2),
        netMetres: round(netMetres, 2),
        orderMetres: round(orderMetres, 2),
        railroadCheck,
        cuttingInstruction,
        // backward-compat aliases
        heightPerPartM: round(repeatCutDrop * INCH_TO_METRE, 2),
        roundedParts: numWidths,
        fabricMeters: round(orderMetres, 2),
        blackoutMeters: 0,
        romanSqft: 0,
        rnft: 0,
    };
}

// ─── 3. WALLPAPER CALCULATOR ──────────────────────────────────────────────────
/**
 * Calculates wallpaper consumption.
 *
 * Required row fields:
 *   qty                    : Number of identical walls (integer ≥ 1)
 *   wallWidth              : Wall width in inches
 *   wallHeight             : Wall height in inches
 *   rollWidth              : Roll width in inches
 *   rollLength             : Roll length in METRES (documentation requirement)
 *   verticalRepeat         : Pattern repeat in inches; 0 → no repeat
 *   patternMatch           : 'None' | 'Random' | 'Straight' | 'Half Drop'
 *   topAllowance           : Top trim allowance in inches
 *   bottomAllowance        : Bottom trim allowance in inches
 *   wastage                : Wastage ratio (e.g. 0.10 = 10%)
 *   orderingUnit           : 'Metres' | 'Rolls'
 *   orderIncrementRequired : 'Yes' | 'No'
 *   orderIncrement         : Rounding increment in metres (if required)
 *   minimumOrder           : Minimum order in metres (if required)
 *   spareRolls             : Extra rolls to add (only when ordering by rolls)
 */
export function calculateWallpaperConsumption(row = {}) {
    const qty = Math.max(1, Number(row.qty ?? row.quantity) || 1);
    const rawWallWidth = row.wallWidth !== undefined && row.wallWidth !== '' && row.wallWidth !== null
        ? Number(row.wallWidth)
        : toInches(row.outToOutWidth ?? row.o2oWidth ?? row.frameToFrameWidth ?? row.f2fWidth ?? row.confirmedWidth ?? row.width, row.unit);
    const wallWidthInch = Number.isFinite(rawWallWidth) ? rawWallWidth : 0;

    const rawWallHeight = row.wallHeight !== undefined && row.wallHeight !== '' && row.wallHeight !== null
        ? Number(row.wallHeight)
        : toInches(row.outToOutHeight ?? row.o2oHeight ?? row.frameToFrameHeight ?? row.f2fHeight ?? row.confirmedHeight ?? row.height, row.unit);
    const wallHeightInch = Number.isFinite(rawWallHeight) ? rawWallHeight : 0;

    const rollWidthInch = Number(row.rollWidth) || 21;
    const rollLengthMetres = Number(row.rollLength) || 10.05; // metres per doc
    const verticalRepeat = Number(row.verticalRepeat) || 0;
    const patternMatch = String(row.patternMatch || 'None');
    const topAllowance = Number(row.topAllowance) || 0;
    const bottomAllowance = Number(row.bottomAllowance) || 0;
    const wastage = Number(row.wastage) || 0;
    const orderingUnit = String(row.orderingUnit || 'Metres');
    const orderIncrRequired = String(row.orderIncrementRequired || 'No').toLowerCase() === 'yes';
    const orderIncrement = Number(row.orderIncrement) || 0.5;
    const minimumOrder = Number(row.minimumOrder) || 0;
    const spareRolls = Number(row.spareRolls) || 0;

    if (wallWidthInch <= 0 || wallHeightInch <= 0 || rollWidthInch <= 0 || rollLengthMetres <= 0) {
        return { ...EMPTY_WALLPAPER, orderUnit: orderingUnit };
    }

    // S : Raw Cut Drop
    const rawCutDrop = wallHeightInch + topAllowance + bottomAllowance;

    // T : Adjusted Strip Length (pattern-aware)
    let adjustedStripLength = rawCutDrop;
    if (verticalRepeat > 0) {
        const pm = patternMatch.toLowerCase().trim();
        // Only 'Straight' and 'Half Drop' patterns require repeat adjustment
        if (pm === 'straight' || pm === 'half drop') {
            adjustedStripLength = ceiling(rawCutDrop / verticalRepeat) * verticalRepeat;
        }
        // 'None' and 'Random' → no adjustment
    }

    // U : Strips per Wall: CEILING(wallWidth / rollWidth)
    const stripsPerWall = Math.ceil(wallWidthInch / rollWidthInch);

    // V : Required Strips (all walls combined)
    const requiredStrips = stripsPerWall * qty;

    // Convert roll length to inches for strips-per-roll calculation
    const rollLengthInches = rollLengthMetres * METRE_TO_INCH;

    // W : Strips per Roll: FLOOR(rollLengthInches / adjustedStripLength)
    const stripsPerRoll = adjustedStripLength > 0
        ? floorTo(rollLengthInches / adjustedStripLength, 1)
        : 0;

    if (stripsPerRoll <= 0) {
        return {
            ...EMPTY_WALLPAPER,
            valid: true, // inputs are valid but roll is too short
            rawCutDrop: round(rawCutDrop, 2),
            adjustedStripLength: round(adjustedStripLength, 2),
            stripsPerWall,
            requiredStrips,
            stripsPerRoll: 0,
            orderUnit: orderingUnit,
            orderCheck: 'Roll too short for one full strip : check strip length vs roll length',
        };
    }

    // X : Required Metres (base, before wastage)
    const baseRequiredMetres = (requiredStrips / stripsPerRoll) * rollLengthMetres;

    // Apply wastage
    const requiredMetres = baseRequiredMetres * (1 + wastage);

    // Y : Base Rolls
    const baseRolls = Math.ceil(requiredStrips / stripsPerRoll);

    // Z / [ : Final Order Quantity
    let finalOrderMetres = 0;
    let finalOrderRolls = 0;
    let orderCheck = 'OK';

    if (orderingUnit.toLowerCase() === 'rolls') {
        // Ordering by Rolls: base rolls + spare rolls
        finalOrderRolls = baseRolls + spareRolls;
        orderCheck = stripsPerRoll >= 1 ? 'OK' : 'Roll too short for one strip';
    } else {
        // Ordering by Metres
        if (orderIncrRequired) {
            const rounded = ceiling(requiredMetres / orderIncrement) * orderIncrement;
            finalOrderMetres = minimumOrder > 0 ? Math.max(minimumOrder, rounded) : rounded;
            if (minimumOrder > 0 && requiredMetres < minimumOrder) {
                orderCheck = `Minimum order applied (${minimumOrder}m)`;
            }
        } else {
            finalOrderMetres = round(requiredMetres, 2);
        }
    }

    const finalOrderQuantity = orderingUnit.toLowerCase() === 'rolls'
        ? finalOrderRolls
        : finalOrderMetres;

    // Cutting Instruction
    const cuttingInstruction = wallpaperInstruction({ requiredStrips, adjustedStripLength, qty });

    return {
        valid: true,
        rawCutDrop: round(rawCutDrop, 2),
        adjustedStripLength: round(adjustedStripLength, 2),
        stripsPerWall,
        requiredStrips,
        stripsPerRoll: Math.floor(stripsPerRoll),
        requiredMetres: round(requiredMetres, 3),
        baseRolls,
        finalOrderMetres: round(finalOrderMetres, 2),
        finalOrderRolls,
        finalOrderQuantity: round(finalOrderQuantity, 2),
        orderUnit: orderingUnit,
        orderCheck,
        cuttingInstruction,
        // backward-compat aliases
        heightPerPartM: round(adjustedStripLength * INCH_TO_METRE, 2),
        roundedParts: stripsPerWall,
        fabricMeters: orderingUnit.toLowerCase() !== 'rolls' ? round(finalOrderMetres, 2) : 0,
        blackoutMeters: 0,
        romanSqft: 0,
        rnft: 0,
        orderMetres: orderingUnit.toLowerCase() !== 'rolls' ? round(finalOrderMetres, 2) : 0,
        numWidths: stripsPerWall,
        netMetres: round(requiredMetres, 3),
    };
}

// ─── DISPATCHER ───────────────────────────────────────────────────────────────
/**
 * Routes to the correct documented calculator based on row.particular.
 * Backward-compatible with the previous consumptionCalc.js return shape:
 *   { widthInch, heightInch, rnft, heightPerPartM, totalParts, roundedParts,
 *     fabricMeters, blackoutMeters, romanSqft }
 *
 * Also returns all new documented output fields for the updated grid display.
 */
export function calculateRowConsumption(row = {}) {
    const particular = String(row.particular || row.windowType || 'MAIN_CURTAIN').toUpperCase();

    if (particular === 'WALLPAPER') {
        const wp = calculateWallpaperConsumption(row);
        return {
            ...wp,
            widthInch: 0,
            heightInch: 0,
            totalParts: wp.stripsPerWall || 0,
        };
    }

    // Roman Blind types : CEILING for widths, no fullness ratio
    if (
        particular.includes('ROMAN') ||
        particular.includes('ROLLER') ||
        particular.includes('WOODEN')
    ) {
        const rb = calculateRomanBlindConsumption(row);
        return {
            ...rb,
            widthInch: 0,
            heightInch: 0,
            totalParts: rb.numWidths || 0,
        };
    }

    // Curtain types (MAIN_CURTAIN, SHEER_CURTAIN, MOTORISED_CURTAIN, default)
    const ct = calculateCurtainConsumption(row);
    return {
        ...ct,
        widthInch: 0,
        heightInch: 0,
        totalParts: ct.numWidths || 0,
    };
}

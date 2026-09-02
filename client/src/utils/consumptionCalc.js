/**
 * Pure consumption calculation engine for frontend live calculations.
 * Exact match with server/src/services/consumption.service.js.
 */

const INCHES_PER_METER = 39.3701;
const INCHES_PER_FOOT = 12;
const SQ_INCHES_PER_SQ_FOOT = 144;

const round = (val, dp = 2) => {
    if (!Number.isFinite(val)) return 0;
    const factor = 10 ** dp;
    return Math.round((val + Number.EPSILON) * factor) / factor;
};

const ceilToHalf = (val) => round(Math.ceil(round(val, 4) * 2) / 2, 2);
const roundToHalf = (val) => round(Math.round(round(val, 4) * 2) / 2, 2);

export function calculateRowConsumption(row = {}) {
    const unit = row.unit || 'mm';
    
    // Parse width & height
    const rawW = Number(row.outToOutWidth || row.o2oWidth || row.frameToFrameWidth || row.f2fWidth || row.width || 0);
    const rawH = Number(row.outToOutHeight || row.o2oHeight || row.frameToFrameHeight || row.f2fHeight || row.height || 0);

    if (rawW <= 0 || rawH <= 0) {
        return {
            widthInch: 0,
            heightInch: 0,
            rnft: 0,
            heightPerPartM: 0,
            totalParts: 0,
            roundedParts: 0,
            fabricMeters: 0,
            blackoutMeters: 0,
            romanSqft: 0,
        };
    }

    // Convert to inches if input is mm
    let widthInch = rawW;
    let heightInch = rawH;
    if (unit === 'mm') {
        widthInch = rawW / 25.4;
        heightInch = rawH / 25.4;
    } else if (unit === 'cm') {
        widthInch = rawW / 2.54;
        heightInch = rawH / 2.54;
    } else if (unit === 'ft') {
        widthInch = rawW * 12;
        heightInch = rawH * 12;
    }

    const particular = String(row.particular || row.windowType || 'MAIN_CURTAIN').toUpperCase();
    const isBlind = particular.includes('BLIND') || particular.includes('ROMAN');
    const isSheer = particular.includes('SHEER');
    const isDrape = !isBlind;

    // Config defaults
    const fullness = Number(row.fullness) || (isBlind ? 1.0 : (isSheer ? 2.5 : 2.5));
    const fabricWidthInch = Number(row.fabricWidthInch) || (isBlind ? 45 : 50);
    const heightAllowanceInch = Number(row.heightAllowanceInch) || (isBlind ? 10 : 12);

    // 1. Running feet
    const rnft = isDrape ? Math.ceil(widthInch / INCHES_PER_FOOT) : 0;

    // 2. Height per part (m)
    const heightPerPartM = round((heightInch + heightAllowanceInch) / INCHES_PER_METER, 2);

    // 3. Total Parts / Panels
    const totalParts = fabricWidthInch > 0 ? round((widthInch * fullness) / fabricWidthInch, 2) : 0;

    // 4. Rounded Parts
    const suggestedParts = totalParts > 0 ? Math.max(1, Math.round(totalParts)) : 0;
    const roundedParts = Number.isFinite(Number(row.partsOverride)) && Number(row.partsOverride) > 0
        ? Math.round(Number(row.partsOverride))
        : suggestedParts;

    // 5. Fabric Meters
    const rawDrapeMeters = (isDrape || particular.includes('ROMAN')) ? roundedParts * heightPerPartM : 0;
    const fabricMeters = rawDrapeMeters > 0 ? ceilToHalf(rawDrapeMeters) : 0;

    // 6. Blackout Meters
    const takesBlackout = particular.includes('MAIN') || particular.includes('MOTOR') || particular.includes('BLACKOUT');
    const blackoutMeters = (takesBlackout && rawDrapeMeters > 0) ? roundToHalf(rawDrapeMeters) : 0;

    // 7. Roman Sqft
    const romanSqft = isBlind ? Math.ceil((widthInch * heightInch) / SQ_INCHES_PER_SQ_FOOT) : 0;

    return {
        widthInch: round(widthInch, 2),
        heightInch: round(heightInch, 2),
        rnft,
        heightPerPartM,
        totalParts,
        roundedParts,
        fabricMeters,
        blackoutMeters,
        romanSqft,
    };
}

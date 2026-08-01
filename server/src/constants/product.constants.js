/**
 * Product vocabulary taken from the Embellish consumption sheet: every row is a
 * "particular" against an area, and each particular consumes material differently.
 */

const PARTICULAR = {
  MAIN_CURTAIN: 'MAIN_CURTAIN',
  SHEER_CURTAIN: 'SHEER_CURTAIN',
  ROMAN_BLIND: 'ROMAN_BLIND',
  WOODEN_BLIND: 'WOODEN_BLIND',
  MOTORISED_CURTAIN: 'MOTORISED_CURTAIN',
};

const PARTICULAR_LABELS = {
  [PARTICULAR.MAIN_CURTAIN]: 'Main Curtain',
  [PARTICULAR.SHEER_CURTAIN]: 'Sheer Curtain',
  [PARTICULAR.ROMAN_BLIND]: 'Main Roman',
  [PARTICULAR.WOODEN_BLIND]: 'Wooden Blind',
  [PARTICULAR.MOTORISED_CURTAIN]: 'Motorised Curtain',
};

/** Drapes are gathered and priced per running foot; blinds are priced per sq ft. */
const DRAPE_PARTICULARS = [
  PARTICULAR.MAIN_CURTAIN,
  PARTICULAR.SHEER_CURTAIN,
  PARTICULAR.MOTORISED_CURTAIN,
];

const BLIND_PARTICULARS = [PARTICULAR.ROMAN_BLIND, PARTICULAR.WOODEN_BLIND];

/** Only opaque main curtains carry a blackout lining; sheers never do. */
const BLACKOUT_PARTICULARS = [PARTICULAR.MAIN_CURTAIN, PARTICULAR.MOTORISED_CURTAIN];

const MATERIAL_TYPE = {
  FABRIC: 'FABRIC',
  BLACKOUT: 'BLACKOUT',
  MOTOR: 'MOTOR',
  TRACK: 'TRACK',
  ACCESSORY: 'ACCESSORY',
  LEAD_BAND: 'LEAD_BAND',
};

const UOM = {
  METER: 'mtr',
  RUNNING_FOOT: 'rnft',
  SQ_FT: 'sqft',
  PIECE: 'pcs',
  SET: 'set',
};

const CURTAIN_STYLE = {
  EYELET: 'EYELET',
  PINCH_PLEAT: 'PINCH_PLEAT',
  RIPPLE_FOLD: 'RIPPLE_FOLD',
  ROD_POCKET: 'ROD_POCKET',
  TAB_TOP: 'TAB_TOP',
};

export {
  PARTICULAR,
  PARTICULAR_LABELS,
  DRAPE_PARTICULARS,
  BLIND_PARTICULARS,
  BLACKOUT_PARTICULARS,
  MATERIAL_TYPE,
  UOM,
  CURTAIN_STYLE,
};

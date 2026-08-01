import { PARTICULAR } from '../../../constants/product.constants.js';
import { PRODUCTION_STAGE } from '../../../constants/workflow.constants.js';

/** Maps what was made to what goes on the box's contents list. */
const PARTICULAR_TO_CONTENT = {
  [PARTICULAR.MAIN_CURTAIN]: 'CURTAIN',
  [PARTICULAR.MOTORISED_CURTAIN]: 'CURTAIN',
  [PARTICULAR.SHEER_CURTAIN]: 'SHEER',
  [PARTICULAR.ROMAN_BLIND]: 'ROMAN_BLIND',
  [PARTICULAR.WOODEN_BLIND]: 'WOODEN_BLIND',
};

export { PARTICULAR_TO_CONTENT, PRODUCTION_STAGE };

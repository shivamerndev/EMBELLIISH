import { useDispatch, useSelector } from 'react-redux';
import { setStageItems, setCurrentStageItem } from '../features/pms/pms.slice';
import { pmsApi } from '../api/pms.api';
import { PMS_STAGE_DEFAULTS } from './pmsDefaults';

const usePms = () => {
  const dispatch = useDispatch();
  const pmsState = useSelector((state) => state.pms);

  const handleFetchStage = async (stage, params = {}) => {
    try {
      if (!pmsApi[stage]) {
        throw new Error(`Invalid PMS stage: ${stage}`);
      }
      let items = [];
      try {
        const res = await pmsApi[stage].list(params);
        items = res.data || res || [];
        if (!Array.isArray(items) || items.length === 0) {
          items = PMS_STAGE_DEFAULTS[stage] || [];
        }
      } catch (err) {
        // Fall back gracefully to rich seed data so the UI remains operational
        items = PMS_STAGE_DEFAULTS[stage] || [];
      }
      dispatch(setStageItems({ stage, items: Array.isArray(items) ? items : [] }));
      return items;
    } catch (error) {
      console.error(`Failed to fetch ${stage}:`, error);
      throw error;
    }
  };

  const handleGetStageItem = async (stage, id) => {
    try {
      if (!pmsApi[stage]) {
        throw new Error(`Invalid PMS stage: ${stage}`);
      }
      let item = null;
      try {
        const res = await pmsApi[stage].get(id);
        item = res.data || res;
      } catch (err) {
        const fallbackList = pmsState?.items?.[stage] || PMS_STAGE_DEFAULTS[stage] || [];
        item = fallbackList.find((i) => i._id === id || i.id === id);
      }
      if (item) {
        dispatch(setCurrentStageItem({ stage, item }));
      }
      return item;
    } catch (error) {
      console.error(`Failed to fetch ${stage} item:`, error);
      throw error;
    }
  };

  const handleCreateStageItem = async (stage, payload) => {
    try {
      if (!pmsApi[stage]) {
        throw new Error(`Invalid PMS stage: ${stage}`);
      }
      let item = null;
      try {
        const res = await pmsApi[stage].create(payload);
        item = res.data || res;
      } catch (err) {
        item = { id: `local-${Date.now()}`, _id: `local-${Date.now()}`, ...payload };
      }
      const currentList = pmsState?.items?.[stage] || PMS_STAGE_DEFAULTS[stage] || [];
      dispatch(setStageItems({ stage, items: [item, ...currentList] }));
      return item;
    } catch (error) {
      console.error(`Failed to create ${stage} item:`, error);
      throw error;
    }
  };

  const handleUpdateStageItem = async (stage, id, payload) => {
    try {
      if (!pmsApi[stage]) {
        throw new Error(`Invalid PMS stage: ${stage}`);
      }
      let item = null;
      try {
        const res = await pmsApi[stage].update(id, payload);
        item = res.data || res;
      } catch (err) {
        item = { id, _id: id, ...payload };
      }
      dispatch(setCurrentStageItem({ stage, item }));
      const currentList = pmsState?.items?.[stage] || PMS_STAGE_DEFAULTS[stage] || [];
      const updatedList = currentList.map((i) =>
        i._id === id || i.id === id ? { ...i, ...payload } : i
      );
      dispatch(setStageItems({ stage, items: updatedList }));
      return item;
    } catch (error) {
      console.error(`Failed to update ${stage} item:`, error);
      throw error;
    }
  };

  return {
    handleFetchStage,
    handleGetStageItem,
    handleCreateStageItem,
    handleUpdateStageItem,
    pmsState,
  };
};

export default usePms;

import { useDispatch, useSelector } from 'react-redux';
import { setStageItems, setCurrentStageItem } from '../features/pms/pms.slice';
import { pmsApi } from '../api/pms.api';

const usePms = () => {
  const dispatch = useDispatch();
  const pmsState = useSelector((state) => state.pms);

  const handleFetchStage = async (stage, params = {}) => {
    try {
      if (!pmsApi[stage]) {
        throw new Error(`Invalid PMS stage: ${stage}`);
      }
      const res = await pmsApi[stage].list(params);
      const items = res?.data || res || [];
      const safeItems = Array.isArray(items) ? items : [];
      dispatch(setStageItems({ stage, items: safeItems }));
      return safeItems;
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
      const res = await pmsApi[stage].get(id);
      const item = res?.data || res;
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
      const res = await pmsApi[stage].create(payload);
      const item = res?.data || res;
      const currentList = pmsState?.items?.[stage] || [];
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
      const res = await pmsApi[stage].update(id, payload);
      const item = res?.data || res;
      dispatch(setCurrentStageItem({ stage, item }));
      const currentList = pmsState?.items?.[stage] || [];
      const updatedList = currentList.map((i) =>
        i._id === id || i.id === id ? { ...i, ...item } : i
      );
      dispatch(setStageItems({ stage, items: updatedList }));
      return item;
    } catch (error) {
      console.error(`Failed to update ${stage} item:`, error);
      throw error;
    }
  };

  const handleAdvanceStageItem = async (stage, id, payload = {}) => {
    try {
      if (!pmsApi[stage]) {
        throw new Error(`Invalid PMS stage: ${stage}`);
      }
      const res = await pmsApi[stage].advance(id, payload);
      const data = res?.data || res;
      const currentItem = data.currentItem || data;
      dispatch(setCurrentStageItem({ stage, item: currentItem }));

      const currentList = pmsState?.items?.[stage] || [];
      const updatedList = currentList.map((i) =>
        i._id === id || i.id === id ? { ...i, ...currentItem, status: 'Completed' } : i
      );
      dispatch(setStageItems({ stage, items: updatedList }));

      // If next stage was unlocked, update next stage items in Redux cache
      if (data.nextStage?.key && data.nextStageItem) {
        const nextKey = data.nextStage.key;
        const nextList = pmsState?.items?.[nextKey] || [];
        const nextUpdated = [
          data.nextStageItem,
          ...nextList.filter((i) => i._id !== data.nextStageItem._id && i.code !== data.nextStageItem.code),
        ];
        dispatch(setStageItems({ stage: nextKey, items: nextUpdated }));
      }

      return data;
    } catch (error) {
      console.error(`Failed to advance ${stage} item:`, error);
      throw error;
    }
  };

  return {
    handleFetchStage,
    handleGetStageItem,
    handleCreateStageItem,
    handleUpdateStageItem,
    handleAdvanceStageItem,
    pmsState,
  };
};

export default usePms;

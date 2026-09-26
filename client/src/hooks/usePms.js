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
      const items = res.data || res || [];
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
      const res = await pmsApi[stage].get(id);
      const item = res.data || res;
      dispatch(setCurrentStageItem({ stage, item }));
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
      const item = res.data || res;
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
      const item = res.data || res;
      dispatch(setCurrentStageItem({ stage, item }));
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

import { createSlice } from '@reduxjs/toolkit';

const pmsSlice = createSlice({
  name: 'pms',
  initialState: {
    items: {},
    current: {},
  },
  reducers: {
    setStageItems: (state, { payload }) => {
      const { stage, items } = payload;
      state.items[stage] = items;
    },
    setCurrentStageItem: (state, { payload }) => {
      const { stage, item } = payload;
      state.current[stage] = item;
    },
    clearStageData: (state, { payload }) => {
      const { stage } = payload;
      if (stage) {
        delete state.items[stage];
        delete state.current[stage];
      } else {
        state.items = {};
        state.current = {};
      }
    },
  },
});

export const { setStageItems, setCurrentStageItem, clearStageData } = pmsSlice.actions;
export default pmsSlice.reducer;

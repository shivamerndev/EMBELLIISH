import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { metaApi } from '../../api';

/**
 * Workflow vocabulary owned by the server — stage names and labels, particulars,
 * calculation defaults. Fetched once so the UI never hard-codes an enum.
 */
export const loadMeta = createAsyncThunk('meta/load', async () => {
  const response = await metaApi.get();
  return response.data;
});

const metaSlice = createSlice({
  name: 'meta',
  initialState: {
    stages: [],
    roles: [],
    particulars: {},
    consumptionDefaults: {},
    rateCardDefaults: {},
    loaded: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadMeta.fulfilled, (state, action) => {
      Object.assign(state, action.payload, { loaded: true });
    });
  },
});

export const selectStageLabel = (stage) => (state) =>
  state.meta.stages.find((entry) => entry.stage === stage)?.label || stage;

export const selectParticularLabel = (particular) => (state) =>
  state.meta.particulars?.[particular] || particular;

export default metaSlice.reducer;

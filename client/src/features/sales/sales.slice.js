import { createSlice } from '@reduxjs/toolkit';

const salesSlice = createSlice({
    name: "sales",
    initialState: {
        leads: [],
        currentLead: {}
    },
    reducers: {
        setLeads: (state, { payload }) => {
            state.leads = payload
        },
        setCurrentLead: (state, { payload }) => {
            state.currentLead = payload;
        }
    }
})

export const { setLeads, setCurrentLead } = salesSlice.actions;
export default salesSlice.reducer;
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  markers: [],
};

export const markersSlice = createSlice({
  name: "markers",
  initialState,
  reducers: {
    importMarkers: (state, action) => {
      state.markers = action.payload;
    },
  },
});
export const { importMarkers } = markersSlice.actions;

export default markersSlice.reducer;
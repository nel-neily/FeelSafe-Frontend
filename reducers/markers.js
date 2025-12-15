import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  markers: [],
  selectedMarker: null,
};

export const markersSlice = createSlice({
  name: "markers",
  initialState,
  reducers: {
    importMarkers: (state, action) => {
      state.markers = action.payload;
    },
    updateMarker: (state, action) => {
      const toUpdateMarker = state.markers.find(
        (marker) => marker._id === action.payload._id
      );

      state.markers = state.markers.filter(
        (marker) => marker._id !== toUpdateMarker._id
      );
      state.markers.push(action.payload);
    },
    updateSelectedMarker: (state, action) => {
      state.selectedMarker = action.payload;
    },
  },
});
export const { importMarkers, updateMarker, updateSelectedMarker } =
  markersSlice.actions;

export default markersSlice.reducer;

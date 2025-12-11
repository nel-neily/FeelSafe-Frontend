import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: {
    id: null,
    email: null,
    token: null,
    username: null,
    addresses: [],
  },
};
export const loginSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    addUser: (state, action) => {
      state.value = action.payload;
    },
    updateUser: (state, action) => {
      if (Object.hasOwn(action.payload, "addresses")) {
        state.value.addresses = action.payload.addresses;
      } else if (Object.hasOwn(action.payload, "username")) {
        state.value.username = action.payload.username;
      }
    },
    logoutUser: (state) => {
      state.value = { email: null, token: null, username: null, addresses: [] };
    },
  },
});

export const { addUser, updateUser, logoutUser } = loginSlice.actions;
export default loginSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    value: { signin: [], signup: [], google: [] },
    };

export const loginSlice = createSlice({
    name: 'login',
    initialState,
    reducers: {
        addSignin: (state, action) => {
            state.value.signin = action.payload;
        },
        addSignup: (state, action) => {
            state.value.signup = action.payload;
        },
        addGoogle: (state, action) => {
            state.value.google = action.payload;
        },
    },
});

export const { addSignin, addSignup, addGoogle } = loginSlice.actions;
export default loginSlice.reducer;
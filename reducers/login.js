import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    value: { signin: [], signup: [], google: [], noaccount: [] },
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
        addNoaccount: (state, action) => {
            state.value.noaccount = action.payload;
        }
    },
});

export const { addSignin, addSignup, addGoogle, addNoaccount } = loginSlice.actions;
export default loginSlice.reducer;
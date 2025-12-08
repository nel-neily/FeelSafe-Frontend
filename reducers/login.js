import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    signin: null,
    signup: null,
    google: false,
    noaccount: false,
    };

export const loginSlice = createSlice({
    name: 'login',
    initialState,
    reducers: {
        // email, password
        addSignin: (state, action) => {
            state.signin = action.payload; 
        },
        // email, password, confirmPassword
        addSignup: (state, action) => {
            state.signup = action.payload; 
        },
        // true ou un token + user info plus tard
        addGoogle: (state, action) => {
            state.google = action.payload; 
        },
        // boolean
        addNoaccount: (state, action) => {
            state.noaccount = action.payload; 
        }
    },
});

export const { addSignin, addSignup, addGoogle, addNoaccount } = loginSlice.actions;
export default loginSlice.reducer;
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    value: {
        email:null,
        token:null,
        username:null,
        addresses: [],

    }
    };

export const loginSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        addUser: (state, action) => {
            state.signin = action.payload; 
        },
}});

export const { addUser } = loginSlice.actions;
export default loginSlice.reducer;
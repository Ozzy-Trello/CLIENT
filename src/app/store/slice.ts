import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  user: any;
  accessToken: string;
  refreshToken: string;
}

const initialAppState: AppState = {
  user: null,
  accessToken: "",
  refreshToken: ""
};

const appSlice = createSlice({
  name: 'appState',
  initialState: initialAppState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    setRefreshToken: (state, action: PayloadAction<string>) => {
      state.refreshToken = action.payload;
    },
  },
});

export const { setUser, setAccessToken, setRefreshToken } = appSlice.actions;
export default appSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  user: any;
  accessToken: string;
  refreshToken: string;
  theme: any;
}

const initialAppState: AppState = {
  user: null,
  accessToken: "",
  refreshToken: "",
  theme: {
    colors: {
      primary: '#08124c', // Main brand color
      secondary: '#ffcc00', // Bright secondary color to complement the primary
      accent: '#ff6f61', // Accent color for highlights and actions
      background: '#ffffff', // Clean white background
      text: '#333333', // Dark text for readability
      muted: '#d9d9d9', // Muted color for borders or subtle text
    },
    fontSizes: {
      h1: 30,
      h2: 28,
      h3: 25,
      h4: 22,
      h5: 20,
      h6: 18,
      body: 15,
      tiny: 12
    }
  }
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
    setTheme: (state, action: PayloadAction<any>) => {
      state.theme = action.payload
    }
  },
});

export const { setUser, setAccessToken, setRefreshToken, setTheme } = appSlice.actions;
export default appSlice.reducer;


// selector
export interface RootState {
  appState: AppState;
}

export function selectUser(state: RootState) {
  return state.appState.user;
}

export function selectAccessToken(state: RootState) {
  return state.appState.accessToken;
}

export function selectRefreshToken(state: RootState) {
  return state.appState.refreshToken;
}

export function selectTheme(state: RootState) {
  return state.appState.theme;
}
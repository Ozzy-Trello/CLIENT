import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppState {
  currentPage: string;
  user: any;
  accessToken: string;
  refreshToken: string;
  theme: any;
}

const initialAppState: AppState = {
  currentPage: 'Ozzy Trello',
  user: null,
  accessToken: "",
  refreshToken: "",
  theme: {
    colors: { // ensure these initial color set in the global.css
      primary: '8, 17, 76', // Main brand color
      secondary: '255, 204, 0', // Bright secondary color to complement the primary
      accent: '255, 111, 97', // Accent color for highlights and actions
      background: '255, 255, 255', // Clean white background
      text: '51, 51, 51', // Dark text for readability
      muted: '217, 217, 217', // Muted color for borders or subtle text
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
    setCurrentPage: (state, action: PayloadAction<any>) => {
      state.currentPage = action.payload;
    },
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

export function selectCurrentPage(state: RootState) {
  return state.appState.currentPage;
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
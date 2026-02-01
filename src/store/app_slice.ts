import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types/user';

export interface AppState {
  currentPage: string;
  user: User | null;
  theme: any;
  isDarkMode: boolean;
}

// Light theme configuration
const lightTheme = {
  colors: {
    primary: '22, 119, 255', // Main brand color
    secondary: '114, 46, 209', // Secondary color
    accent: '255, 193, 7', // Accent color for highlights and actions
    background: '255, 255, 255', // Light background
    surface: '249, 250, 251', // Surface color for cards and panels
    text: '17, 24, 39', // Dark text for readability on light background
    'text-muted': '107, 114, 128', // Muted text color
    muted: '229, 231, 235', // Muted color for borders
    border: '229, 231, 235', // Border color
    success: '40, 167, 69', // Success color
    warning: '255, 193, 7', // Warning color
    error: '220, 53, 69', // Error color
    info: '23, 162, 184', // Info color
  },
  fontSizes: {
    h1: 25,
    h2: 22,
    h3: 20,
    h4: 18,
    h5: 16,
    h6: 14,
    body: 12,
    small: 10,
    tiny: 8,
  }
};

// Dark theme configuration
const darkTheme = {
  colors: {
    primary: '22, 119, 255', // Main brand color
    secondary: '114, 46, 209', // Secondary color
    accent: '255, 193, 7', // Accent color for highlights and actions
    background: '29, 33, 37', // Dark background
    surface: '35, 39, 44', // Surface color for cards and panels
    text: '182, 194, 207', // Light text for readability on dark background
    'text-muted': '156, 162, 175', // Muted text color
    muted: '68, 74, 82', // Muted color for borders
    border: '68, 74, 82', // Border color
    success: '40, 167, 69', // Success color
    warning: '255, 193, 7', // Warning color
    error: '220, 53, 69', // Error color
    info: '23, 162, 184', // Info color
  },
  fontSizes: {
    h1: 25,
    h2: 22,
    h3: 20,
    h4: 18,
    h5: 16,
    h6: 14,
    body: 12,
    small: 10,
    tiny: 8,
  }
};

const initialAppState: AppState = {
  currentPage: 'Ozzy Trello',
  user: null,
  isDarkMode: false, // Default to light mode
  theme: lightTheme
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
    setTheme: (state, action: PayloadAction<any>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      state.theme = state.isDarkMode ? darkTheme : lightTheme;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      state.theme = action.payload ? darkTheme : lightTheme;
    }
  },
});

export const { setUser, setTheme, toggleTheme, setDarkMode } = appSlice.actions;
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

export function selectTheme(state: RootState) {
  return state.appState.theme;
}

export function selectIsDarkMode(state: RootState) {
  return state.appState.isDarkMode;
}
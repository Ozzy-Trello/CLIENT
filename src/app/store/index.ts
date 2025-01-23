import { configureStore } from '@reduxjs/toolkit';
import appSlice from './slice';

export const store = configureStore({
  reducer: {
    appState: appSlice,
  },
});

// Infer types for the RootState and AppDispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

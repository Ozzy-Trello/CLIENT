// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore, PersistConfig } from "redux-persist";
import { combineReducers } from "redux";
import { encryptTransform } from "redux-persist-transform-encrypt";
import appSlice from "./app_slice";
import boardsSlice from "./board_slice";
import workspacesSlice from "./workspace_slice";
import usersSlice from "./user_slice";
import listSlice from "./list_slice";
import cardSlice from "./card_slice";

// noop storage for server-side
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

// Use storage based on environment
const storage = typeof window !== "undefined"
  ? require("redux-persist/lib/storage").default
  : createNoopStorage();

// encryptor config
const encryptor = encryptTransform({
  secretKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "fallback-key",
  onError: (error) => console.error("Encryption Error:", error),
});

// Combine Reducers
const rootReducer = combineReducers({
  appState: appSlice,
  workspaces: workspacesSlice,
  users: usersSlice,
  boards: boardsSlice,
  lists: listSlice,
  cards: cardSlice
});

// persist config
const persistConfig: PersistConfig<ReturnType<typeof rootReducer>> = {
  key: "root",
  storage,
  transforms: [encryptor],
};

// Apply Persisted Reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Infer types for RootState and AppDispatch
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Reset function to clear the persisted state for demo purposes
export const resetDemoState = () => {
  persistor.purge();
  window.location.reload();
};
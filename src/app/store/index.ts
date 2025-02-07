import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore, PersistConfig } from "redux-persist";
import { combineReducers } from "redux";
import { encryptTransform } from "redux-persist-transform-encrypt";
import appSlice from "./slice";

// Ensure storage is only used on the client side
const storage = typeof window !== "undefined" ? require("redux-persist/lib/storage").default : undefined;

// encryptor config
const encryptor = encryptTransform({
  secretKey: process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "fallback-key",
  onError: (error) => console.error("Encryption Error:", error),
});

// persist config
const persistConfig: PersistConfig<{ appState: ReturnType<typeof appSlice> }> = {
  key: "root",
  storage,
  transforms: [encryptor],
};

// Combine Reducers
const rootReducer = combineReducers({
  appState: appSlice,
});

// Apply Persisted Reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Persistor
export const persistor = persistStore(store);

// Infer types for RootState and AppDispatch
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

import axios from "axios";
import camelcaseKeys from "camelcase-keys";
import { useSelector } from "react-redux";
import snakecaseKeys from "snakecase-keys";
import { selectAccessToken } from "../store/app_slice";
import { store } from "../store";

// Create axios instance with interceptors to handle case conversion
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BE_BASE_URL+'/v1'
});

// Request interceptor to convert camelCase to snake_case
api.interceptors.request.use((config) => {
  const accessToken = store.getState().appState.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (config.data) {
    config.data = snakecaseKeys(config.data, { deep: true });
  }
  return config;
});

// Response interceptor to convert snake_case to camelCase
api.interceptors.response.use((response) => {
  if (response.data) {
    response.data = camelcaseKeys(response.data, { deep: true });
  }
  return response;
});

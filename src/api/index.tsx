import TokenStorage from "@utils/token-storage";
import axios from "axios";
import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";

// Create axios instance with interceptors to handle case conversion
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BE_BASE_URL+'/v1'
});

// Request interceptor to convert camelCase to snake_case
api.interceptors.request.use((config) => {
  // Add authorization header if token exists
  const accessToken = TokenStorage.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  
  // Skip snakecase conversion for FormData
  if (config.data && !(config.data instanceof FormData)) {
    // Only apply to plain objects, not FormData, arrays, etc.
    if (typeof config.data === 'object' && !Array.isArray(config.data)) {
      config.data = snakecaseKeys(config.data, { deep: true });
    }
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

export default api;
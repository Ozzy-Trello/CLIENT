import TokenStorage from "@utils/token-storage";
import axios, { AxiosError } from "axios";
import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";
import { refresh } from "./auth";

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

// Queue system to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

// Process the queue of failed requests after token refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor with queue management
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    console.log("Error interceptor triggered:", error?.response?.status);
   
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Mark this request as a retry attempt to prevent infinite loops
      originalRequest._retry = true;
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        console.log("Token refresh in progress - queueing request");
        
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest?.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
          return Promise.reject(error);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      console.log("401 detected - attempting token refresh");
      isRefreshing = true;
      
      const refreshToken = TokenStorage.getRefreshToken();
      const accessToken = TokenStorage.getAccessToken();
      
      if (!refreshToken) {
        console.log("No refresh token available");
        isRefreshing = false;
        processQueue(error, null);
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        const response = await refresh({
          'refresh_token': refreshToken, 
          "access_token": accessToken
        });
        
        if (response?.data?.accessToken) {
          console.log("Token refresh successful");
          
          const newAccessToken = response.data.accessToken;
          const newRefreshToken = response.data.refreshToken || refreshToken;
          
          // Store the new tokens
          TokenStorage.setTokens(newAccessToken, newRefreshToken);
          
          // Update the original request with new token
          if (originalRequest?.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          
          // Process the queue with the new token
          processQueue(null, newAccessToken);
          
          // Reset the refreshing flag
          isRefreshing = false;
          
          // Retry the original request
          return api(originalRequest);
        }
        
        throw new Error("Invalid refresh response");
        
      } catch (refreshError) {
        console.log("Token refresh failed:", refreshError);
        
        // Reset state and process queue with error
        isRefreshing = false;
        processQueue(refreshError, null);
        
        // Clear tokens and redirect to login
        TokenStorage.clearTokens();
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// request interceptor to ensure fresh tokens
api.interceptors.request.use(
  (config) => {
    const token = TokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
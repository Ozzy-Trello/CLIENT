import { LoginResponse } from '../dto/auth';
import { api } from '.';
import { ApiResponse } from '../types/type';

// API functions
export const login = async (params: any): Promise<ApiResponse<LoginResponse>> => {
  const { data } = await api.post('/auth/login', params);
  return data;
};

export const refresh = async (params: any): Promise<ApiResponse<LoginResponse>> => {
  const { data } = await api.post('/auth/refresh-token', params);
  return data;
};

export const register = async (params: any): Promise<ApiResponse> => {
  const { data } = await api.post('/auth/register', params);
  return data;
};
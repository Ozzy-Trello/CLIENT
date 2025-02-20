// api/auth.tsx
import { ApiResponse, User } from '@/app/dto/types';
import { LoginResponse } from '../dto/auth';
import { api } from '.';

// API functions
export const login = async (params: any): Promise<ApiResponse<LoginResponse>> => {
  const { data } = await api.post('/auth/login', params);
  return data;
};

export const register = async (params: any): Promise<ApiResponse> => {
  const { data } = await api.post('/auth/register', params);
  return data;
};
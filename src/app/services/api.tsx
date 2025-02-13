// lib/api.ts
import axios from 'axios';
import { ApiResponse, User } from '../types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BE_BASE_URL+'/v1'
});

export const login = async (params: any): Promise<ApiResponse> => {
  const { data } = await api.post('/auth/login', params);
  return data;
};

export const register = async (params: any): Promise<ApiResponse> => {
  const { data } = await api.post('/auth/register', params);
  return data;
};
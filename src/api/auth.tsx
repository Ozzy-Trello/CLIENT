import { api } from ".";
import { ApiResponse } from "../types/type";
import {
  LoginRequest,
  LoginResponse,
  LoginTokens,
  OtpChallenge,
  ResendOtpRequest,
  VerifyOtpRequest,
} from "../dto/auth";

export const login = async (
  params: LoginRequest,
): Promise<ApiResponse<LoginResponse>> => {
  const { data } = await api.post("/auth/login", params);
  return data;
};

export const verifyOtp = async (
  params: VerifyOtpRequest,
): Promise<ApiResponse<LoginTokens>> => {
  const { data } = await api.post("/auth/verify-otp", params);
  return data;
};

export const resendOtp = async (
  params: ResendOtpRequest,
): Promise<ApiResponse<OtpChallenge>> => {
  const { data } = await api.post("/auth/resend-otp", params);
  return data;
};

export const refresh = async (params: any): Promise<ApiResponse<LoginTokens>> => {
  const { data } = await api.post("/auth/refresh-token", params);
  return data;
};

export const register = async (params: any): Promise<ApiResponse> => {
  const { data } = await api.post("/auth/register", params);
  return data;
};

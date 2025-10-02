import { api } from ".";
import { ApiResponse } from "../types/type";

export interface CreateShortUrlRequest {
  original_url: string;
  expires_at?: Date;
}

export interface ShortUrlResponse {
  id: string;
  short_code: string;
  original_url: string;
  workspace_id?: string;
  board_id?: string;
  card_id?: string;
  list_id?: string;
  created_by?: string;
  expires_at?: Date;
  click_count: number;
  created_at: Date;
  updated_at: Date;
}

export const createShortUrl = async (
  data: CreateShortUrlRequest
): Promise<ApiResponse<ShortUrlResponse>> => {
  const { data: response } = await api.post("/short-url", data);
  return response;
};

export const getShortUrlDetails = async (
  shortCode: string
): Promise<ApiResponse<ShortUrlResponse>> => {
  const { data } = await api.get(`/short-url/${shortCode}`);
  return data;
};

export const deleteShortUrl = async (
  shortCode: string
): Promise<ApiResponse<void>> => {
  const { data } = await api.delete(`/short-url/${shortCode}`);
  return data;
};

export const updateShortUrlExpiration = async (
  shortCode: string,
  expiresAt: Date | null
): Promise<ApiResponse<ShortUrlResponse>> => {
  const { data } = await api.put(`/short-url/${shortCode}/expiration`, {
    expires_at: expiresAt,
  });
  return data;
};

export const getShortUrlsByCardId = async (
  cardId: string
): Promise<ApiResponse<ShortUrlResponse[]>> => {
  const { data } = await api.get(`/short-url/card/${cardId}`);
  return data;
};

export const buildShortUrl = (shortCode: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  return `${baseUrl}/api/auth/r/${shortCode}`;
};
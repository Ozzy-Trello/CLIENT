import { api } from ".";
import { ApiResponse } from "../types/type";

export interface Warna {
  id: string;
  name: string;
  bahanId: string;
  hexCode?: string;
  code?: string;
  bahanInfo?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface WarnaCreateRequest {
  name: string;
  bahanId: string;
  hexCode?: string;
  code?: string;
}

export interface WarnaUpdateRequest {
  name?: string;
  bahanId?: string;
  hexCode?: string;
  code?: string;
}

// Get all warnas (optionally filtered by bahan)
export const getWarnas = async (
  page: number = 1,
  limit: number = 100,
  bahanId?: string
): Promise<ApiResponse<Warna[]>> => {
  const params: any = { page, limit };
  if (bahanId) {
    params.bahanId = bahanId;
  }
  const { data } = await api.get("/warna", { params });
  return data;
};

// Get single warna by ID
export const getWarna = async (
  warnaId: string
): Promise<ApiResponse<Warna>> => {
  const { data } = await api.get(`/warna/${warnaId}`);
  return data;
};

// Create new warna
export const createWarna = async (
  warna: WarnaCreateRequest
): Promise<ApiResponse<Warna>> => {
  const { data } = await api.post("/warna", warna);
  return data;
};

// Update warna
export const updateWarna = async (
  warnaId: string,
  updates: WarnaUpdateRequest
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/warna/${warnaId}`, updates);
  return data;
};

// Delete warna
export const deleteWarna = async (
  warnaId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/warna/${warnaId}`);
  return data;
};
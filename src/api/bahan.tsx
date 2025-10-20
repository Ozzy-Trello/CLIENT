import { api } from ".";
import { ApiResponse } from "../types/type";

export interface Bahan {
  id: string;
  name: string;
  productId: string;
  productInfo?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BahanCreateRequest {
  name: string;
  productId: string;
}

export interface BahanUpdateRequest {
  name?: string;
  productId?: string;
}

// Get all bahans (optionally filtered by product)
export const getBahans = async (
  page: number = 1,
  limit: number = 100,
  productId?: string
): Promise<ApiResponse<Bahan[]>> => {
  const params: any = { page, limit };
  if (productId) {
    params.productId = productId;
  }
  const { data } = await api.get("/bahan", { params });
  return data;
};

// Get single bahan by ID
export const getBahan = async (
  bahanId: string
): Promise<ApiResponse<Bahan>> => {
  const { data } = await api.get(`/bahan/${bahanId}`);
  return data;
};

// Create new bahan
export const createBahan = async (
  bahan: BahanCreateRequest
): Promise<ApiResponse<Bahan>> => {
  const { data } = await api.post("/bahan", bahan);
  return data;
};

// Update bahan
export const updateBahan = async (
  bahanId: string,
  updates: BahanUpdateRequest
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/bahan/${bahanId}`, updates);
  return data;
};

// Delete bahan
export const deleteBahan = async (
  bahanId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/bahan/${bahanId}`);
  return data;
};
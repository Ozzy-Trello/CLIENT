import { api } from ".";
import { ApiResponse } from "../types/type";

export interface Accessory {
  id: string;
  name: string;
  productId: string;
  productName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccessoryCreateRequest {
  name: string;
  productId: string;
}

export interface AccessoryUpdateRequest {
  name?: string;
  productId?: string;
}

// Get all accessories (optionally filtered by product)
export const getAccessories = async (
  page: number = 1,
  limit: number = 100,
  productId?: string
): Promise<ApiResponse<Accessory[]>> => {
  const params: any = { page, limit };
  if (productId) {
    params.productId = productId;
  }
  const { data } = await api.get("/accessory", { params });
  return data;
};

// Get single accessory by ID
export const getAccessory = async (
  accessoryId: string
): Promise<ApiResponse<Accessory>> => {
  const { data } = await api.get(`/accessory/${accessoryId}`);
  return data;
};

// Create new accessory
export const createAccessory = async (
  accessory: AccessoryCreateRequest
): Promise<ApiResponse<Accessory>> => {
  const { data } = await api.post("/accessory", accessory);
  return data;
};

// Update accessory
export const updateAccessory = async (
  accessoryId: string,
  updates: AccessoryUpdateRequest
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/accessory/${accessoryId}`, updates);
  return data;
};

// Delete accessory
export const deleteAccessory = async (
  accessoryId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/accessory/${accessoryId}`);
  return data;
};

// Bulk insert accessories
export interface AccessoryBulkInsertRequest {
  accessories: Array<{
    name: string;
    productName: string;
  }>;
}

export interface AccessoryBulkInsertResult {
  totalAttempted: number;
  totalCreated: number;
  totalSkipped: number;
  errors: Array<{
    index: number;
    name: string;
    productName: string;
    error: string;
  }>;
}

export const bulkInsertAccessories = async (
  request: AccessoryBulkInsertRequest
): Promise<ApiResponse<AccessoryBulkInsertResult>> => {
  const { data } = await api.post("/accessory/bulk", request);
  return data;
};

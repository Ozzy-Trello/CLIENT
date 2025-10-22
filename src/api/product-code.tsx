import { api } from ".";
import { ApiResponse } from "../types/type";

export interface ProductCode {
  id: string;
  productId: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
  };
}

export interface ProductCodeCreateRequest {
  productId: string;
  code: string;
  description?: string;
}

export interface ProductCodeUpdateRequest {
  code?: string;
  description?: string;
}

export interface ProductCodeBulkInsertRequest {
  productCodes: Array<{
    productId: string;
    code: string;
    description?: string;
  }>;
}

export interface ProductCodeBulkInsertResult {
  total_attempted: number;
  total_created: number;
  total_skipped: number;
  errors: Array<{
    index: number;
    productId: string;
    code: string;
    error: string;
  }>;
}

// Get all product codes
export const getProductCodes = async (
  page: number = 1,
  limit: number = 100,
  productId?: string
): Promise<ApiResponse<ProductCode[]>> => {
  const { data } = await api.get("/product-code", {
    params: { page, limit, productId },
  });
  return data;
};

// Get single product code by ID
export const getProductCode = async (
  productCodeId: string
): Promise<ApiResponse<ProductCode>> => {
  const { data } = await api.get(`/product-code/${productCodeId}`);
  return data;
};

// Create new product code
export const createProductCode = async (
  productCode: ProductCodeCreateRequest
): Promise<ApiResponse<ProductCode>> => {
  const { data } = await api.post("/product-code", productCode);
  return data;
};

// Update product code
export const updateProductCode = async (
  productCodeId: string,
  updates: ProductCodeUpdateRequest
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/product-code/${productCodeId}`, updates);
  return data;
};

// Delete product code
export const deleteProductCode = async (
  productCodeId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/product-code/${productCodeId}`);
  return data;
};

// Bulk insert product codes
export const bulkInsertProductCodes = async (
  request: ProductCodeBulkInsertRequest
): Promise<ApiResponse<ProductCodeBulkInsertResult>> => {
  const { data } = await api.post("/product-code/bulk", request);
  return data;
};
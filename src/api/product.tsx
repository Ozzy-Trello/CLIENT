import { api } from ".";
import { ApiResponse } from "../types/type";

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCreateRequest {
  name: string;
  code: string;
  description?: string;
}

export interface ProductUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
}

export interface ProductBulkInsertRequest {
  products: {
    name: string;
    code: string;
    description?: string;
  }[];
}

export interface ProductBulkInsertResult {
  total_attempted: number;
  total_created: number;
  total_skipped: number;
  errors: {
    index: number;
    code: string;
    name: string;
    error: string;
  }[];
}

// Get all products
export const getProducts = async (
  page: number = 1,
  limit: number = 100
): Promise<ApiResponse<Product[]>> => {
  const { data } = await api.get("/product", {
    params: { page, limit },
  });
  return data;
};

// Get single product by ID
export const getProduct = async (
  productId: string
): Promise<ApiResponse<Product>> => {
  const { data } = await api.get(`/product/${productId}`);
  return data;
};

// Create new product
export const createProduct = async (
  product: ProductCreateRequest
): Promise<ApiResponse<Product>> => {
  const { data } = await api.post("/product", product);
  return data;
};

// Update product
export const updateProduct = async (
  productId: string,
  updates: ProductUpdateRequest
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/product/${productId}`, updates);
  return data;
};

// Delete product
export const deleteProduct = async (
  productId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/product/${productId}`);
  return data;
};

// Bulk insert products
export const bulkInsertProducts = async (
  request: ProductBulkInsertRequest
): Promise<ApiResponse<ProductBulkInsertResult>> => {
  const { data } = await api.post("/product/bulk", request);
  return data;
};

import { api } from ".";
import { ApiResponse } from "../types/type";

export interface ProductCode {
  id: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  formDisplayName?: string | null;
  formImageUrl?: string | null;
  showInForm: boolean;
  productCodes: ProductCode[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCreateRequest {
  name: string;
  formDisplayName?: string | null;
  formImageUrl?: string | null;
  showInForm?: boolean;
}

export interface ProductUpdateRequest {
  name?: string;
  order?: number;
  formDisplayName?: string | null;
  formImageUrl?: string | null;
  showInForm?: boolean;
}

export interface ProductOrderUpdateRequest {
  order: number;
}

export interface ProductBulkInsertRequest {
  products: {
    name: string;
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
  limit: number = 100,
  search?: string
): Promise<ApiResponse<Product[]>> => {
  const params: any = { page, limit };
  if (search?.trim()) {
    params.name = search.trim();
  }

  const { data } = await api.get("/product", {
    params,
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

// Update product order
export const updateProductOrder = async (
  productId: string,
  orderData: ProductOrderUpdateRequest
): Promise<ApiResponse<any>> => {
  try {
    console.log(`[API] updateProductOrder called with:`, { productId, orderData });
    console.log(`[API] Making PATCH request to: /product/${productId}/order`);
    
    const { data } = await api.patch(`/product/${productId}/order`, orderData);
    
    console.log(`[API] updateProductOrder success for product ${productId}:`, data);
    return data;
  } catch (error: any) {
    console.error(`[API] updateProductOrder failed for product ${productId}:`, {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    throw error;
  }
};

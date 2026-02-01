import { api } from ".";
import { ApiResponse } from "../types/type";

// PO Product interfaces
export interface POProduct {
  id: string;
  po_id: string;
  hikmat_product_id: string;
  product_name: string;
  terloading?: number;
  bahan_terpakai?: number;
  orderCreated?: boolean;
  request_id?: number;
  sentBy?: string | null;
  satuan?: string;
  adjustment_no?: string;
  adjustment_name?: string;
  description?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface POProductCategory {
  id: string;
  poProductId: string;
  categoryId: string;
  subcategoryId: string;
  value: number;
   description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePOProductRequest {
  po_id: string;
  hikmat_product_id: string;
  product_name: string;
  terloading?: number;
  orderCreated?: boolean;
  request_id?: number;
  sentBy?: string | null;
  satuan?: string;
  adjustment_no?: string;
  adjustment_name?: string;
  description?: string | null;
}

export interface UpdatePOProductRequest {
  hikmat_product_id?: string;
  product_name?: string;
  terloading?: number;
  bahan_terpakai?: number;
  orderCreated?: boolean;
  request_id?: number;
  sentBy?: string | null;
  satuan?: string;
  adjustment_no?: string;
  adjustment_name?: string;
  description?: string | null;
}

export interface CreatePOProductCategoryRequest {
  po_product_id: string;
  junction_id: string;
  value: number;
  description?: string | null;
}

export interface UpdatePOProductCategoryRequest {
  value?: number;
  description?: string | null;
}

export interface POProductWithCategories {
  id: string;
  poId: string;
  hikmatProductId: string;
  productName: string;
  terloading?: number;
  bahanTerpakai?: number;
  orderCreated?: boolean;
  request_id?: number;
  sentBy?: string | null;
  satuan?: string;
  adjustment_no?: string;
  adjustment_name?: string;
  adjustmentNo?: string;
  adjustmentName?: string;
  description?: string | null;
  categories: POProductCategory[];
  createdAt: Date;
  updatedAt: Date;
}

// PO Product CRUD operations
export const createPOProduct = async (
  data: CreatePOProductRequest
): Promise<ApiResponse<POProduct>> => {
  const { data: response } = await api.post("/po-product", data);
  return response;
};

export const getPOProducts = async (params?: {
  po_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<POProduct[]>> => {
  const { data } = await api.get("/po-product", { params });
  return data;
};

export const getPOProduct = async (
  id: string
): Promise<ApiResponse<POProduct>> => {
  const { data } = await api.get(`/po-product/${id}`);
  return data;
};

export const updatePOProduct = async (
  id: string,
  data: UpdatePOProductRequest
): Promise<ApiResponse<null>> => {
  const { data: response } = await api.put(`/po-product/${id}`, data);
  return response;
};

export const deletePOProduct = async (
  id: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/po-product/${id}`);
  return data;
};

// PO Product Category CRUD operations
export const createPOProductCategory = async (
  data: CreatePOProductCategoryRequest
): Promise<ApiResponse<POProductCategory>> => {
  const { data: response } = await api.post("/po-product/categories", data);
  return response;
};

export const getPOProductCategories = async (params?: {
  po_product_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<POProductCategory[]>> => {
  const { data } = await api.get("/po-product/categories", { params });
  return data;
};

export const getPOProductCategory = async (
  id: string
): Promise<ApiResponse<POProductCategory>> => {
  const { data } = await api.get(`/po-product/categories/${id}`);
  return data;
};

export const updatePOProductCategory = async (
  id: string,
  data: UpdatePOProductCategoryRequest
): Promise<ApiResponse<null>> => {
  const { data: response } = await api.put(
    `/po-product/categories/${id}`,
    data
  );
  return response;
};

export const deletePOProductCategory = async (
  id: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/po-product/categories/${id}`);
  return data;
};

// Bulk operations
export const createPOProductCategoriesBulk = async (
  categories: CreatePOProductCategoryRequest[]
): Promise<ApiResponse<POProductCategory[]>> => {
  const { data } = await api.post("/po-product/categories/bulk", {
    categories,
  });
  return data;
};

// Utility operations
export const getPOProductsWithCategories = async (params?: {
  po_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<POProductWithCategories[]>> => {
  const { data } = await api.get("/po-product/with-categories", { params });
  return {
    data: data.data || [],
    message:
      data.message || "PO Products with categories retrieved successfully",
  };
};

export const updatePOProductCategories = async (
  poId: string,
  updates: {
    po_product_id: string;
    categories: CreatePOProductCategoryRequest[];
  }[]
): Promise<ApiResponse<null>> => {
  const { data } = await api.put(`/po-product/categories/update/${poId}`, {
    updates,
  });
  return data;
};

// Helper function to get PO products by card ID (through POs)
export const getPOProductsByCardId = async (
  cardId: string
): Promise<ApiResponse<POProductWithCategories[]>> => {
  try {
    // First get POs by card ID
    const posResponse = await api.get(`/po?card_id=${cardId}`);
    const pos = posResponse.data?.data || [];

    if (pos.length === 0) {
      return {
        data: [],
        message: "No POs found for this card",
      };
    }

    // Get PO products for each PO
    const allPOProducts: POProductWithCategories[] = [];
    for (const po of pos) {
      const poProductsResponse = await getPOProductsWithCategories({
        po_id: po.id,
      });
      if (poProductsResponse.data) {
        allPOProducts.push(...poProductsResponse.data);
      }
    }

    return {
      data: allPOProducts,
      message: "PO Products retrieved successfully",
    };
  } catch (error) {
    console.error("Error fetching PO products by card ID:", error);
    throw error;
  }
};

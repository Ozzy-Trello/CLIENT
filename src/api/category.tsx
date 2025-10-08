import { api } from ".";
import { ApiResponse } from "../types/type";
import {
  MainCategory,
  Subcategory,
  CategorySubcategoryJunction,
  CategorySubcategoryJunctionWithDetails,
  MainCategoryWithSubcategories,
  CreateMainCategoryRequest,
  UpdateMainCategoryRequest,
  CreateSubcategoryRequest,
  UpdateSubcategoryRequest,
  CreateJunctionRequest,
  BulkCreateJunctionRequest,
  UpdateJunctionRequest,
  CategorySystemOverview,
  CategoryValidationResponse,
  CategoryFilter,
  ReorderMainCategoriesRequest,
  ReorderSubcategoriesRequest,
} from "../types/category";

// Utility functions to transform backend snake_case to frontend camelCase
const transformMainCategory = (backendCategory: any): MainCategory => ({
  id: backendCategory.id,
  name: backendCategory.name,
  displayOrder: backendCategory.display_order,
  createdAt: backendCategory.created_at ? new Date(backendCategory.created_at) : undefined,
  updatedAt: backendCategory.updated_at ? new Date(backendCategory.updated_at) : undefined,
});

const transformSubcategory = (backendSubcategory: any): Subcategory => ({
  id: backendSubcategory.id,
  name: backendSubcategory.name,
  createdAt: backendSubcategory.created_at ? new Date(backendSubcategory.created_at) : undefined,
  updatedAt: backendSubcategory.updated_at ? new Date(backendSubcategory.updated_at) : undefined,
});

const transformJunction = (backendJunction: any): CategorySubcategoryJunction => ({
  id: backendJunction.id,
  mainCategoryId: backendJunction.main_category_id,
  subcategoryId: backendJunction.subcategory_id,
  calculationWeight: backendJunction.calculation_weight,
  displayOrder: backendJunction.display_order,
  isTotalField: backendJunction.is_total_field,
  isEditableTotal: backendJunction.is_editable_total,
  operator: backendJunction.operator || "add",
  createdAt: backendJunction.created_at ? new Date(backendJunction.created_at) : undefined,
  updatedAt: backendJunction.updated_at ? new Date(backendJunction.updated_at) : undefined,
});

// Request transformation functions to convert frontend camelCase to backend snake_case
const transformCreateMainCategoryRequest = (request: CreateMainCategoryRequest) => ({
  name: request.name,
  display_order: request.displayOrder,
});

const transformUpdateMainCategoryRequest = (request: UpdateMainCategoryRequest) => ({
  name: request.name,
  display_order: request.displayOrder,
});

const transformCreateJunctionRequest = (request: CreateJunctionRequest) => ({
  main_category_id: request.mainCategoryId,
  subcategory_id: request.subcategoryId,
  calculation_weight: request.calculationWeight,
  display_order: request.displayOrder,
  is_total_field: request.isTotalField,
  is_editable_total: request.isEditableTotal,
  operator: request.operator,
});

const transformUpdateJunctionRequest = (request: UpdateJunctionRequest) => ({
  main_category_id: request.mainCategoryId,
  subcategory_id: request.subcategoryId,
  calculation_weight: request.calculationWeight,
  display_order: request.displayOrder,
  is_total_field: request.isTotalField,
  is_editable_total: request.isEditableTotal,
  operator: request.operator,
});

const transformBulkCreateJunctionRequest = (request: BulkCreateJunctionRequest) => ({
  main_category_id: request.mainCategoryId,
  subcategories: request.subcategories.map(sub => ({
    subcategory_id: sub.subcategoryId,
    calculation_weight: sub.calculationWeight,
    display_order: sub.displayOrder,
    is_total_field: sub.isTotalField,
    is_editable_total: sub.isEditableTotal,
    operator: sub.operator,
  })),
});

// Main Category Operations
export const getMainCategories = async (
  workspaceId: string,
  filter?: CategoryFilter
): Promise<ApiResponse<MainCategory[]>> => {
  const params = new URLSearchParams();
  if (filter?.search) params.append("search", filter.search);
  if (filter?.page) params.append("page", filter.page.toString());
  if (filter?.limit) params.append("limit", filter.limit.toString());

  const { data } = await api.get(`/category/main?${params.toString()}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const getAllMainCategories = async (
  workspaceId: string
): Promise<ApiResponse<MainCategory[]>> => {
  const { data } = await api.get("/category/main/all", {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(transformMainCategory);
  }
  
  return data;
};

export const getMainCategory = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<MainCategory>> => {
  const { data } = await api.get(`/category/main/${id}`, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformMainCategory(data.data);
  }
  
  return data;
};

export const createMainCategory = async (
  category: CreateMainCategoryRequest,
  workspaceId: string
): Promise<ApiResponse<MainCategory>> => {
  // Transform the request to match backend expectations
  const transformedRequest = transformCreateMainCategoryRequest(category);
  
  const { data } = await api.post("/category/main", transformedRequest, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformMainCategory(data.data);
  }
  
  return data;
};

export const updateMainCategory = async (
  id: string,
  category: UpdateMainCategoryRequest,
  workspaceId: string
): Promise<ApiResponse<MainCategory>> => {
  // Transform the request to match backend expectations
  const transformedRequest = transformUpdateMainCategoryRequest(category);
  
  const { data } = await api.put(`/category/main/${id}`, transformedRequest, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformMainCategory(data.data);
  }
  
  return data;
};

export const deleteMainCategory = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/category/main/${id}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// Subcategory Operations
export const getSubcategories = async (
  workspaceId: string,
  filter?: CategoryFilter
): Promise<ApiResponse<Subcategory[]>> => {
  const params = new URLSearchParams();
  if (filter?.search) params.append("search", filter.search);
  if (filter?.page) params.append("page", filter.page.toString());
  if (filter?.limit) params.append("limit", filter.limit.toString());

  const { data } = await api.get(`/category/sub?${params.toString()}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const getAllSubcategories = async (
  workspaceId: string
): Promise<ApiResponse<Subcategory[]>> => {
  const { data } = await api.get("/category/sub/all", {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(transformSubcategory);
  }
  
  return data;
};

export const getSubcategory = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<Subcategory>> => {
  const { data } = await api.get(`/category/sub/${id}`, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformSubcategory(data.data);
  }
  
  return data;
};

export const createSubcategory = async (
  subcategory: CreateSubcategoryRequest,
  workspaceId: string
): Promise<ApiResponse<Subcategory>> => {
  const { data } = await api.post("/category/sub", subcategory, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformSubcategory(data.data);
  }
  
  return data;
};

export const updateSubcategory = async (
  id: string,
  subcategory: UpdateSubcategoryRequest,
  workspaceId: string
): Promise<ApiResponse<Subcategory>> => {
  const { data } = await api.put(`/category/sub/${id}`, subcategory, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformSubcategory(data.data);
  }
  
  return data;
};

export const deleteSubcategory = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/category/sub/${id}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// Junction Operations
// Note: No general getJunctions endpoint exists in backend
// Use getJunctionsByCategory or getJunctionsBySubcategory instead

export const getJunction = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunction>> => {
  const { data } = await api.get(`/category/junction/${id}`, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformJunction(data.data);
  }
  
  return data;
};

export const getJunctionWithDetails = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunctionWithDetails>> => {
  const { data } = await api.get(`/category/junction/${id}/details`, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  // Note: This might need a more complex transformation for the "WithDetails" type
  if (data.data) {
    data.data = {
      ...transformJunction(data.data),
      mainCategory: data.data.mainCategory ? transformMainCategory(data.data.mainCategory) : undefined,
      subcategory: data.data.subcategory ? transformSubcategory(data.data.subcategory) : undefined,
    };
  }
  
  return data;
};

export const getJunctionsByCategory = async (
  categoryId: string,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunctionWithDetails[]>> => {
  const { data } = await api.get(`/category/main/${categoryId}/junctions`, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map((item: any) => ({
      ...transformJunction(item),
      mainCategory: item.mainCategory ? transformMainCategory(item.mainCategory) : undefined,
      subcategory: item.subcategory ? transformSubcategory(item.subcategory) : undefined,
    }));
  }
  
  return data;
};

export const getJunctionsBySubcategory = async (
  subcategoryId: string,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunctionWithDetails[]>> => {
  const { data } = await api.get(`/category/sub/${subcategoryId}/junctions`, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map((item: any) => ({
      ...transformJunction(item),
      mainCategory: item.mainCategory ? transformMainCategory(item.mainCategory) : undefined,
      subcategory: item.subcategory ? transformSubcategory(item.subcategory) : undefined,
    }));
  }
  
  return data;
};

export const createJunction = async (
  junction: CreateJunctionRequest,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunction>> => {
  // Transform the request to match backend expectations
  const transformedRequest = transformCreateJunctionRequest(junction);
  
  const { data } = await api.post("/category/junction", transformedRequest, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformJunction(data.data);
  }
  
  return data;
};

export const createJunctionWithTotalLogic = async (
  junction: CreateJunctionRequest,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunction[]>> => {
  // Transform the request to match backend expectations
  const transformedRequest = transformCreateJunctionRequest(junction);
  
  const { data } = await api.post("/category/junction/with-total-logic", transformedRequest, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(transformJunction);
  }
  
  return data;
};

export const bulkCreateJunctions = async (
  junctions: BulkCreateJunctionRequest,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunction[]>> => {
  // Transform the request to match backend expectations
  const transformedRequest = transformBulkCreateJunctionRequest(junctions);
  
  const { data } = await api.post("/category/junction/bulk", transformedRequest, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(transformJunction);
  }
  
  return data;
};

export const updateJunction = async (
  id: string,
  junction: UpdateJunctionRequest,
  workspaceId: string
): Promise<ApiResponse<CategorySubcategoryJunction>> => {
  // Transform the request to match backend expectations
  const transformedRequest = transformUpdateJunctionRequest(junction);
  
  const { data } = await api.put(`/category/junction/${id}`, transformedRequest, {
    headers: { "workspace-id": workspaceId },
  });
  
  // Transform the backend response to match frontend types
  if (data.data) {
    data.data = transformJunction(data.data);
  }
  
  return data;
};

export const deleteJunction = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/category/junction/${id}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const deleteJunctionWithTotalLogic = async (
  id: string,
  workspaceId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/category/junction/${id}/with-total-logic`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// Bulk delete operations removed - not implemented in backend and not used in frontend

// Category with Subcategories
export const getCategoriesWithSubcategories = async (
  workspaceId: string
): Promise<ApiResponse<MainCategoryWithSubcategories[]>> => {
  const { data } = await api.get("/category/main/all/subcategories", {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const getCategoryWithSubcategories = async (
  categoryId: string,
  workspaceId: string
): Promise<ApiResponse<MainCategoryWithSubcategories>> => {
  const { data } = await api.get(`/category/main/${categoryId}/subcategories`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// System Operations
export const getCategorySystemOverview = async (
  workspaceId: string
): Promise<ApiResponse<CategorySystemOverview>> => {
  const { data } = await api.get("/category/system/overview", {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const validateJunctionData = async (
  junction: CreateJunctionRequest,
  workspaceId: string
): Promise<ApiResponse<CategoryValidationResponse>> => {
  const { data } = await api.post("/category/system/validate", junction, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

// Reordering Operations
export const reorderSubcategoriesInCategory = async (
  categoryId: string,
  reorderData: ReorderSubcategoriesRequest,
  workspaceId: string
): Promise<ApiResponse<null>> => {
  const { data } = await api.put(`/category/category/${categoryId}/subcategories/reorder`, reorderData, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};
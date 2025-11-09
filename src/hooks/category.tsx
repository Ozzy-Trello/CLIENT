import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMainCategories,
  getAllMainCategories,
  getMainCategory,
  createMainCategory,
  updateMainCategory,
  deleteMainCategory,
  getSubcategories,
  getAllSubcategories,
  getSubcategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getJunction,
  getJunctionWithDetails,
  getJunctionsByCategory,
  getJunctionsBySubcategory,
  createJunction,
  createJunctionWithTotalLogic,
  bulkCreateJunctions,
  updateJunction,
  deleteJunction,
  deleteJunctionWithTotalLogic,
  getCategoriesWithSubcategories,
  getCategoryWithSubcategories,
  getCategorySystemOverview,
  validateJunctionData,
  reorderSubcategoriesInCategory,
} from "../api/category";
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
  ReorderSubcategoriesRequest,
} from "../types/category";
import { message } from "antd";

// Main Category Hooks
export function useMainCategories(
  workspaceId: string,
  filter?: CategoryFilter
) {
  return useQuery({
    queryKey: ["mainCategories", workspaceId, filter],
    queryFn: () => getMainCategories(workspaceId, filter),
    enabled: !!workspaceId,
    staleTime: 5000,
  });
}

export function useAllMainCategories(workspaceId: string) {
  return useQuery({
    queryKey: ["allMainCategories", workspaceId],
    queryFn: () => getAllMainCategories(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5000,
  });
}

export function useMainCategory(id: string, workspaceId: string) {
  return useQuery({
    queryKey: ["mainCategory", id, workspaceId],
    queryFn: () => getMainCategory(id, workspaceId),
    enabled: !!id && !!workspaceId,
    staleTime: 5000,
  });
}

export function useCreateMainCategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMainCategoryRequest) =>
      createMainCategory(data, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mainCategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allMainCategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Main category created successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to create main category"
      );
    },
  });
}

export function useUpdateMainCategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMainCategoryRequest;
    }) => updateMainCategory(id, data, workspaceId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["mainCategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allMainCategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["mainCategory", id, workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Main category updated successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to update main category"
      );
    },
  });
}

export function useDeleteMainCategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMainCategory(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mainCategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allMainCategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Main category deleted successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to delete main category"
      );
    },
  });
}

// Subcategory Hooks
export function useSubcategories(workspaceId: string, filter?: CategoryFilter) {
  return useQuery({
    queryKey: ["subcategories", workspaceId, filter],
    queryFn: () => getSubcategories(workspaceId, filter),
    enabled: !!workspaceId,
    staleTime: 5000,
  });
}

export function useAllSubcategories(workspaceId: string) {
  return useQuery({
    queryKey: ["allSubcategories", workspaceId],
    queryFn: () => getAllSubcategories(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5000,
  });
}

export function useSubcategory(id: string, workspaceId: string) {
  return useQuery({
    queryKey: ["subcategory", id, workspaceId],
    queryFn: () => getSubcategory(id, workspaceId),
    enabled: !!id && !!workspaceId,
    staleTime: 5000,
  });
}

export function useCreateSubcategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubcategoryRequest) =>
      createSubcategory(data, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allSubcategories", workspaceId],
      });
      message.success("Subcategory created successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to create subcategory"
      );
    },
  });
}

export function useUpdateSubcategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSubcategoryRequest;
    }) => updateSubcategory(id, data, workspaceId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["subcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["subcategory", id, workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Subcategory updated successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to update subcategory"
      );
    },
  });
}

export function useDeleteSubcategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSubcategory(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["allSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Subcategory deleted successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to delete subcategory"
      );
    },
  });
}

// Junction Hooks
// Note: useJunctions removed - no general getJunctions endpoint exists in backend
// Use useJunctionsByCategory or useJunctionsBySubcategory instead

export function useJunctionsByCategory(
  categoryId: string,
  workspaceId: string
) {
  return useQuery({
    queryKey: ["junctionsByCategory", categoryId, workspaceId],
    queryFn: () => getJunctionsByCategory(categoryId, workspaceId),
    enabled: !!categoryId && !!workspaceId,
    staleTime: 5000,
  });
}

export function useJunctionsBySubcategory(
  subcategoryId: string,
  workspaceId: string
) {
  return useQuery({
    queryKey: ["junctionsBySubcategory", subcategoryId, workspaceId],
    queryFn: () => getJunctionsBySubcategory(subcategoryId, workspaceId),
    enabled: !!subcategoryId && !!workspaceId,
    staleTime: 5000,
  });
}

export function useCreateJunction(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (junction: CreateJunctionRequest) =>
      createJunction(junction, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categorySystemOverview", workspaceId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to create junction"
      );
    },
  });
}

export function useUpdateJunction(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      junction,
    }: {
      id: string;
      junction: UpdateJunctionRequest;
    }) => updateJunction(id, junction, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categorySystemOverview", workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["junctionsByCategory"] });
      message.success("Updated successfully");
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to update junction"
      );
    },
  });
}

export function useCreateJunctionWithTotalLogic(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (junction: CreateJunctionRequest) =>
      createJunctionWithTotalLogic(junction, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categorySystemOverview", workspaceId],
      });
      message.success("Junction created with Total logic applied");
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Failed to create junction with Total logic"
      );
    },
  });
}

export function useDeleteJunction(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJunction(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categorySystemOverview", workspaceId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to delete junction"
      );
    },
  });
}

export function useDeleteJunctionWithTotalLogic(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJunctionWithTotalLogic(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["categorySystemOverview", workspaceId],
      });
      message.success("Junction deleted with Total logic applied");
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Failed to delete junction with Total logic"
      );
    },
  });
}

export function useBulkCreateJunctions(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateJunctionRequest) =>
      bulkCreateJunctions(data, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["junctions", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["junctionsByCategory"] });
      queryClient.invalidateQueries({ queryKey: ["junctionsBySubcategory"] });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Junctions created successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to create junctions"
      );
    },
  });
}

// Categories with Subcategories Hooks
export function useCategoriesWithSubcategories(workspaceId: string) {
  return useQuery({
    queryKey: ["categoriesWithSubcategories", workspaceId],
    queryFn: async () => {
      const response = await getCategoriesWithSubcategories(workspaceId);
      return response.data;
    },
    enabled: !!workspaceId,
    staleTime: 5000,
  });
}

export function useCategoryWithSubcategories(
  categoryId: string,
  workspaceId: string
) {
  return useQuery({
    queryKey: ["categoryWithSubcategories", categoryId, workspaceId],
    queryFn: async () => {
      const response = await getCategoryWithSubcategories(
        categoryId,
        workspaceId
      );
      return response.data;
    },
    enabled: !!categoryId && !!workspaceId,
    staleTime: 5000,
  });
}

// System Hooks
export function useCategorySystemOverview(workspaceId: string) {
  return useQuery({
    queryKey: ["categorySystemOverview", workspaceId],
    queryFn: () => getCategorySystemOverview(workspaceId),
    enabled: !!workspaceId,
    staleTime: 10000,
  });
}

export function useValidateJunctionData(workspaceId: string) {
  return useMutation({
    mutationFn: (data: CreateJunctionRequest) =>
      validateJunctionData(data, workspaceId),
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Validation failed");
    },
  });
}

// Reordering Hooks
export function useReorderSubcategoriesInCategory(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: ReorderSubcategoriesRequest;
    }) => reorderSubcategoriesInCategory(categoryId, data, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["junctionsByCategory"] });
      queryClient.invalidateQueries({
        queryKey: ["categoriesWithSubcategories", workspaceId],
      });
      message.success("Subcategories reordered successfully");
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Failed to reorder subcategories"
      );
    },
  });
}

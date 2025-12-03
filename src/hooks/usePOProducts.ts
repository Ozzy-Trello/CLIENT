import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPOProductsByCardId,
  getPOProductsWithCategories,
  createPOProduct,
  updatePOProduct,
  deletePOProduct,
  createPOProductCategory,
  updatePOProductCategory,
  deletePOProductCategory,
  updatePOProductCategories,
  POProductWithCategories,
  CreatePOProductRequest,
  UpdatePOProductRequest,
  CreatePOProductCategoryRequest,
  UpdatePOProductCategoryRequest,
} from "../api/po-product";
import {
  CategoryData,
  BahanTab,
  ProductItem,
} from "../app/workspace/[workspaceId]/board/[boardId]/card-details/bahan-fields/types";

// Hook to get PO products by card ID
export const usePOProductsByCardId = (cardId: string) => {
  return useQuery({
    queryKey: ["po-products", "card", cardId],
    queryFn: async () => {
      const result = await getPOProductsByCardId(cardId);
      return result;
    },
    enabled: !!cardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to get PO products with categories
export const usePOProductsWithCategories = (params?: {
  po_id?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ["po-products", "with-categories", params],
    queryFn: () => getPOProductsWithCategories(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to create PO product
export const useCreatePOProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePOProductRequest) => createPOProduct(data),
    onSuccess: () => {
      // Invalidate and refetch PO products queries - use broader invalidation to catch all related queries
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
      // Also specifically invalidate card-based queries
      queryClient.invalidateQueries({ queryKey: ["po-products", "card"] });
    },
  });
};

// Hook to update PO product
export const useUpdatePOProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePOProductRequest }) =>
      updatePOProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
      queryClient.invalidateQueries({ queryKey: ["po-products", "card"] });
    },
  });
};

// Hook to delete PO product
export const useDeletePOProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePOProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
      queryClient.invalidateQueries({ queryKey: ["po-products", "card"] });
    },
  });
};

// Hook to create PO product category
export const useCreatePOProductCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePOProductCategoryRequest) =>
      createPOProductCategory(data),
    onSuccess: () => {
      // Invalidate all po-products queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
    },
  });
};

// Hook to update PO product category
export const useUpdatePOProductCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePOProductCategoryRequest;
    }) => updatePOProductCategory(id, data),
    onSuccess: () => {
      // Invalidate all po-products queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
    },
  });
};

// Hook to delete PO product category
export const useDeletePOProductCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePOProductCategory(id),
    onSuccess: () => {
      // Invalidate all po-products queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
    },
  });
};

// Hook to update multiple PO product categories
export const useUpdatePOProductCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      poId,
      updates,
    }: {
      poId: string;
      updates: {
        po_product_id: string;
        categories: CreatePOProductCategoryRequest[];
      }[];
    }) => updatePOProductCategories(poId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-products"] });
      queryClient.invalidateQueries({ queryKey: ["po-products", "card"] });
    },
  });
};

export const transformPOProductToProductItem = (
  poProduct: POProductWithCategories,
  categories?: any[]
): ProductItem => {
  // Helper to coerce potentially locale-formatted numeric strings to numbers
  const toNumber = (input: any): number => {
    if (input === null || input === undefined) return 0;
    if (typeof input === "number") return Number.isFinite(input) ? input : 0;
    const str = String(input).trim();
    if (!str) return 0;
    const normalized = str.includes(".") && str.includes(",")
      ? str.replace(/\./g, "").replace(/,/g, ".")
      : str.replace(/,/g, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const description =
    poProduct.categories?.find((cat) => cat.description)?.description ?? null;
  const categoryIds = poProduct.categories?.map((cat) => cat.id) || [];
  const primaryCategoryId = categoryIds[0];

  return {
    id: poProduct.hikmatProductId, // Use hikmatProductId as the product ID
    name: poProduct.productName,
    poProductId: poProduct.id, // Include PO product ID for API updates
    poProductCategoryId: primaryCategoryId,
    poProductCategoryIds: categoryIds,
    description: description ?? poProduct.description ?? null,
    orderCreated: poProduct.orderCreated || false, // Include order created status
    requestId: poProduct.request_id,
    satuan: poProduct.satuan, // Include unit field
    adjustment_no: poProduct.adjustmentNo, // Include adjustment account number
    adjustment_name: poProduct.adjustmentName, // Include adjustment account name
    bahanTabs: [
      {
        id: poProduct.id, // Use the PO product ID as bahan tab ID
        name: poProduct.productName,
        description,
        terloading: toNumber(poProduct.terloading), // Ensure numeric type for calculations
        bahanTerpakai: toNumber(poProduct.bahanTerpakai),
        sisaBahan: 0,
        jmlProduksi: 0,
        estBahan: 0,
        efisiensi: 0,
      },
    ],
    categoryData: (() => {
      if (!poProduct.categories) return [];

      // Group POProductCategory records by categoryId
      const categoryMap = new Map<string, CategoryData>();

      poProduct.categories.forEach((category) => {
        const categoryId = category.categoryId;

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            categoryId,
            categoryName: "", // You might need to fetch this separately
            subcategoryValues: [],
          });
        }

        const categoryData = categoryMap.get(categoryId)!;

        // Find junction data from categories to get isTotalField and isEditableTotal
        let isTotalField = false;
        let isEditableTotal = false;
        let operator: "add" | "subtract" | "multiply" | "divide" = "add";

        if (categories) {
          const categoryInfo = categories.find((cat) => cat.id === categoryId);
          if (categoryInfo?.subcategories) {
            const subcategoryInfo = categoryInfo.subcategories.find(
              (sub: any) => sub.id === category.subcategoryId
            );
            if (subcategoryInfo?.junction) {
              isTotalField = subcategoryInfo.junction.isTotalField || false;
              isEditableTotal =
                subcategoryInfo.junction.isEditableTotal || false;
              operator = subcategoryInfo.junction.operator || "add";
            }
          }
        }

        categoryData.subcategoryValues.push({
          subcategoryId: category.subcategoryId,
          subcategoryName: "", // You might need to fetch this separately
          value: category.value,
          isTotalField,
          isEditableTotal,
          operator,
        });
      });

      return Array.from(categoryMap.values());
    })(),
  };
};

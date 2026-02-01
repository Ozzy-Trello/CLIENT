import { useQuery } from "@tanstack/react-query";
import { getProductCodes, ProductCode } from "@api/product-code";

interface UseProductCodesOptions {
  limit?: number;
  enabled?: boolean;
  productId?: string;
}

export const useProductCodes = (options?: UseProductCodesOptions) => {
  const limit = options?.limit ?? 1000;
  const productId = options?.productId;

  return useQuery<ProductCode[]>({
    queryKey: ["productCodes", limit, productId],
    queryFn: async () => {
      const response = await getProductCodes(1, limit, productId);
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

import { useQuery } from "@tanstack/react-query";
import { getProducts, Product } from "@api/product";

interface UseProductsOptions {
  limit?: number;
  enabled?: boolean;
}

export const useProducts = (options?: UseProductsOptions) => {
  const limit = options?.limit ?? 1000;

  return useQuery<Product[]>({
    queryKey: ["products", limit],
    queryFn: async () => {
      const response = await getProducts(1, limit);
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};


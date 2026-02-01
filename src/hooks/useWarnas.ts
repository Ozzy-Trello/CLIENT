import { useQuery } from "@tanstack/react-query";
import { getWarnas, Warna } from "@api/warna";

interface UseWarnasOptions {
  limit?: number;
  enabled?: boolean;
  bahanId?: string;
}

export const useWarnas = (options?: UseWarnasOptions) => {
  const limit = options?.limit ?? 1000;
  const bahanId = options?.bahanId;

  return useQuery<Warna[]>({
    queryKey: ["warnas", limit, bahanId],
    queryFn: async () => {
      const response = await getWarnas(1, limit, bahanId);
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

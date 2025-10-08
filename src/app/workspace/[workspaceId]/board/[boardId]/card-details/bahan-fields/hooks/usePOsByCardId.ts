import { useQuery } from "@tanstack/react-query";
import { getPOsByCardId, PO } from "@api/po";
import { POItem } from "../types";

/**
 * Transform backend PO data to frontend POItem structure
 */
const transformPOToItem = (po: PO, index: number): POItem => ({
  id: po.id,
  cardId: po.cardId,
  poNumber: po.poNumber,
  name: `PO ${index + 1}`, // Display name using simple index (PO 1, PO 2, etc.)
  terloading: 0, // Initialize with default values
  bahanTerpakai: 0, // Initialize with default values
  products: [], // Start with no products
  createdAt: po.createdAt,
  updatedAt: po.updatedAt,
});

/**
 * Custom hook to fetch POs by card ID using React Query
 */
export const usePOsByCardId = (cardId: string) => {
  return useQuery({
    queryKey: ["pos", cardId],
    queryFn: async () => {
      // console.log("🔍 [usePOsByCardId] Fetching POs for cardId:", cardId);
      const response = await getPOsByCardId(cardId);
      // console.log("🔍 [usePOsByCardId] API Response:", response);
      
      // Transform backend PO data to frontend POItem structure
      const transformedPOs = response.data?.map((po, index) => transformPOToItem(po, index)) || [];
      // console.log("🔍 [usePOsByCardId] Transformed POs:", transformedPOs);
      
      return transformedPOs;
    },
    enabled: !!cardId, // Only run query if cardId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export default usePOsByCardId;
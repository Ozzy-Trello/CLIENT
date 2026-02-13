import { useQuery } from "@tanstack/react-query";
import { getPOsByCardId, PO } from "@api/po";
import { POItem } from "../types";

/**
 * Transform backend PO data to frontend POItem structure
 */
const transformPOToItem = (po: any, index: number): POItem => {
  return {
    id: po.id,
    cardId: po.cardId || po.card_id, // Handle both naming conventions
    poNumber: po.poNumber || po.po_number, // Handle both naming conventions
    name: `PO ${index + 1}`, // Display name using simple index (PO 1, PO 2, etc.)
    terloading: 0, // Initialize with default values
    bahanTerpakai: null, // Initialize as null - only sync when user actually sets a value
    products: [], // Initialize with empty array - products come from POProduct API via dropdown selection
    createdAt: po.createdAt || po.created_at, // Handle both naming conventions
    updatedAt: po.updatedAt || po.updated_at, // Handle both naming conventions
  };
};

/**
 * Normalize API response to handle both response formats:
 * 1. Direct array: [po1, po2, ...]
 * 2. Wrapped object: { statusCode: 200, message: "...", data: [po1, po2, ...] }
 */
const normalizeAPIResponse = (response: any): PO[] => {
  // If response has a 'data' property, it's the wrapped format
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data || [];
  }

  // If response is an array, it's the direct format
  if (Array.isArray(response)) {
    return response;
  }

  // If response.data is an array, use that
  if (response && response.data && Array.isArray(response.data)) {
    return response.data;
  }

  // Fallback to empty array
  return [];
};

/**
 * Custom hook to fetch POs by card ID using React Query
 */
export const usePOsByCardId = (cardId: string) => {
  return useQuery({
    queryKey: ["pos", cardId],
    queryFn: async () => {
      const response = await getPOsByCardId(cardId);

      // Normalize the response to handle both formats
      const normalizedData = normalizeAPIResponse(response);

      // Transform backend PO data to frontend POItem structure
      const transformedPOs = normalizedData.map((po, index) => transformPOToItem(po, index));

      return transformedPOs;
    },
    enabled: !!cardId, // Only run query if cardId is provided
    staleTime: 30 * 1000, // 30 seconds — short enough to pick up newly auto-created POs
    refetchOnMount: "always", // Always refetch when BahanFields mounts to ensure correct PO count
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export default usePOsByCardId;

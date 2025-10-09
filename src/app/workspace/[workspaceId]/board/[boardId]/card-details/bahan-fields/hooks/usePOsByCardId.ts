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
    bahanTerpakai: 0, // Initialize with default values
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
      console.log("🔍 [usePOsByCardId] Fetching POs for cardId:", cardId);
      const response = await getPOsByCardId(cardId);
      console.log("🔍 [usePOsByCardId] Raw API Response:", response);
      
      // Normalize the response to handle both formats
      const normalizedData = normalizeAPIResponse(response);
      console.log("🔍 [usePOsByCardId] Normalized data:", normalizedData);
      
      // Transform backend PO data to frontend POItem structure
      const transformedPOs = normalizedData.map((po, index) => transformPOToItem(po, index));
      console.log("🔍 [usePOsByCardId] Transformed POs:", transformedPOs);
      
      return transformedPOs;
    },
    enabled: !!cardId, // Only run query if cardId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export default usePOsByCardId;
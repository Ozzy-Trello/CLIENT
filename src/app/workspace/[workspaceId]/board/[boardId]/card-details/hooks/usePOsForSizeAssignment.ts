import { useQuery } from "@tanstack/react-query";
import { getPOsByCardId, PO } from "@api/po";

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
 * Custom hook to fetch POs for size assignment
 * This hook is specifically designed for the po-size-assignment component
 * and returns raw PO objects with items, not transformed POItem objects
 */
export const usePOsForSizeAssignment = (cardId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["pos-size-assignment", cardId],
    queryFn: async () => {
      const response = await getPOsByCardId(cardId);
      
      // Normalize the response to handle both formats
      const normalizedData = normalizeAPIResponse(response);
      
      return normalizedData;
    },
    enabled: enabled && !!cardId,
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: "always", // Refetch every time modal opens
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export default usePOsForSizeAssignment;
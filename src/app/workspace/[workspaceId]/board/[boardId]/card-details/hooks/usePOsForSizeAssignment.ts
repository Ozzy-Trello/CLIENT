import { useQuery } from "@tanstack/react-query";
import { getPOById, getPOsByCardId, PO } from "@api/po";

const normalizeAPIResponse = (response: any): PO[] => {
  console.log("🔵 [Query Hook] Normalizing response:", {
    hasResponse: !!response,
    responseType: typeof response,
    isArray: Array.isArray(response),
    hasData: response && "data" in response,
    statusCode: response?.status_code || response?.statusCode,
    dataLength:
      response?.data?.length ||
      (Array.isArray(response) ? response.length : 0),
  });

  if (response && typeof response === "object" && "data" in response) {
    const normalized = response.data || [];
    console.log("🔵 [Query Hook] Using wrapped format:", {
      length: normalized.length,
    });
    return normalized;
  }

  if (Array.isArray(response)) {
    console.log("🔵 [Query Hook] Using array format:", {
      length: response.length,
    });
    return response;
  }

  if (response && response.data && Array.isArray(response.data)) {
    console.log("🔵 [Query Hook] Using response.data:", {
      length: response.data.length,
    });
    return response.data;
  }

  console.log("⚠️ [Query Hook] No valid format, returning empty array");
  return [];
};

export const usePOsForSizeAssignment = (
  cardId: string,
  enabled: boolean = true
) => {
  console.log("🔵 [Query Hook] Hook initialized:", { cardId, enabled });

  return useQuery({
    queryKey: ["pos-size-assignment", cardId],
    queryFn: async () => {
      console.log("🔴 [Query Hook] 🚀 QueryFn EXECUTING:", {
        cardId,
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();
      try {
        const response = await getPOsByCardId(cardId);
        const duration = Date.now() - startTime;

        console.log("🟢 [Query Hook] ✅ API call SUCCESS:", {
          cardId,
          duration: `${duration}ms`,
          response,
          timestamp: new Date().toISOString(),
        });

        const normalizedData = normalizeAPIResponse(response);
        const detailedPOs = await Promise.all(
          normalizedData.map(async (po) => {
            const detailResponse = await getPOById(po.id);
            return detailResponse.data ?? po;
          })
        );

        console.log("🟢 [Query Hook] Returning data:", {
          count: detailedPOs.length,
          poIds: detailedPOs.map((po) => po.id),
          timestamp: new Date().toISOString(),
        });

        return detailedPOs;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error("❌ [Query Hook] API call FAILED:", {
          cardId,
          duration: `${duration}ms`,
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    enabled: enabled && !!cardId,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 3,
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
      console.log(
        `🔄 [Query Hook] Retry attempt ${attemptIndex + 1}, delay: ${delay}ms`
      );
      return delay;
    },
  });
};

export default usePOsForSizeAssignment;

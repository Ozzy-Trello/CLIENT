import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHikmatItemList,
  getAllRequests,
  verifyRequest,
  rejectRequest,
  updateRequest,
  updateRequestUserAssignments,
} from "@api/accurate";

export const useHikmatItemList = () => {
  return useQuery({
    queryKey: ["hikmatItemList"],
    queryFn: getHikmatItemList,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime in v5)
  });
};

/**
 * Optimized hook for getAllRequests with better caching and pagination
 */
export const useRequestsOptimized = (
  page: number = 1,
  limit: number = 10,
  filter?: Record<string, any>
) => {
  return useQuery({
    queryKey: ["requests", page, limit, filter],
    queryFn: () => getAllRequests(page, limit, filter),
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for dynamic data
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

/**
 * Hook for background refetching of requests with longer cache
 */
export const useRequestsWithBackground = (
  page: number = 1,
  limit: number = 10,
  filter?: Record<string, any>
) => {
  return useQuery({
    queryKey: ["requests-background", page, limit, filter],
    queryFn: () => getAllRequests(page, limit, filter),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });
};

/**
 * Optimized mutation for verifying requests with cache updates
 */
export const useVerifyRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyRequest,
    onSuccess: (data, requestId) => {
      // Update all request queries in cache
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["requests-background"] });

      // Optimistically update cache if possible
      queryClient.setQueriesData({ queryKey: ["requests"] }, (oldData: any) => {
        if (!oldData?.data) return oldData;

        return {
          ...oldData,
          data: oldData.data.map((request: any) =>
            request.id === requestId
              ? { ...request, isVerified: true }
              : request
          ),
        };
      });
    },
    onError: (error) => {
      console.error("Failed to verify request:", error);
    },
  });
};

/**
 * Optimized mutation for rejecting requests with cache updates
 */
export const useRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectRequest,
    onSuccess: (data, requestId) => {
      // Update all request queries in cache
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["requests-background"] });

      // Optimistically update cache if possible
      queryClient.setQueriesData({ queryKey: ["requests"] }, (oldData: any) => {
        if (!oldData?.data) return oldData;

        return {
          ...oldData,
          data: oldData.data.map((request: any) =>
            request.id === requestId
              ? { ...request, isRejected: true }
              : request
          ),
        };
      });
    },
    onError: (error) => {
      console.error("Failed to reject request:", error);
    },
  });
};

/**
 * Optimized mutation for updating request fields (sentBy, receivedBy) with cache updates
 */
export const useUpdateRequestFields = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { sent_by?: string; received_by?: string } }) => {
      // Use the specific API function for user assignments
      return updateRequestUserAssignments(id, updates);
    },
    onSuccess: (data, { id, updates }) => {
      // Update all request queries in cache
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["requests-background"] });

      // Optimistically update cache if possible
      queryClient.setQueriesData({ queryKey: ["requests"] }, (oldData: any) => {
        if (!oldData?.data) return oldData;

        return {
          ...oldData,
          data: oldData.data.map((request: any) =>
            request.id === id
              ? { 
                  ...request, 
                  sentBy: updates.sent_by || request.sentBy,
                  receivedBy: updates.received_by || request.receivedBy
                }
              : request
          ),
        };
      });
    },
    onError: (error) => {
      console.error("Failed to update request fields:", error);
    },
  });
};

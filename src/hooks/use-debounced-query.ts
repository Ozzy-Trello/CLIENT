import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useDebounce } from "./use-debounce";

/**
 * Custom hook that combines debouncing with React Query for search operations
 * @param queryKey - The base query key
 * @param queryFn - The query function
 * @param searchTerm - The search term to debounce
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @param options - Additional React Query options
 * @returns React Query result with debounced search
 */
export function useDebouncedQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  searchTerm: string,
  delay: number = 300,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  return useQuery({
    queryKey: [...queryKey, debouncedSearchTerm],
    queryFn,
    enabled: debouncedSearchTerm.length >= 2, // Only search with 2+ characters
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Custom hook for debounced search with pagination
 * @param queryKey - The base query key
 * @param queryFn - The query function that accepts search term and pagination
 * @param searchTerm - The search term to debounce
 * @param page - Current page number
 * @param limit - Items per page
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @param options - Additional React Query options
 * @returns React Query result with debounced search and pagination
 */
export function useDebouncedPaginatedQuery<T>(
  queryKey: any[],
  queryFn: (searchTerm: string, page: number, limit: number) => Promise<T>,
  searchTerm: string,
  page: number = 1,
  limit: number = 10,
  delay: number = 300,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  return useQuery({
    queryKey: [...queryKey, debouncedSearchTerm, page, limit],
    queryFn: () => queryFn(debouncedSearchTerm, page, limit),
    enabled: debouncedSearchTerm.length >= 2 || debouncedSearchTerm === "", // Allow empty search
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous page data while loading
    ...options,
  });
}

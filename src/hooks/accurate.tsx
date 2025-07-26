import { useQuery } from "@tanstack/react-query";
import { getHikmatItemList } from "@api/accurate";

export const useHikmatItemList = () => {
  return useQuery({
    queryKey: ["hikmatItemList"],
    queryFn: getHikmatItemList,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime in v5)
  });
};

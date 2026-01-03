import { useQuery } from "@tanstack/react-query";
import { getSewingPlans, getSewingPlanner, SewingPlan, SewingPlanList } from "@api/plans";

export const useSewingPlans = (params: {
  page: number;
  limit: number;
  search?: string;
  date?: string;
  excludeLists?: string[];
  excludeListNameLike?: string;
  includeLists?: string[];
}) => {
  const {
    page,
    limit,
    search,
    date,
    excludeLists,
    excludeListNameLike,
    includeLists,
  } = params;
  return useQuery<SewingPlanList>({
    queryKey: [
      "sewing-plans",
      page,
      limit,
      search,
      date,
      excludeLists,
      excludeListNameLike,
      includeLists,
    ],
    queryFn: async () => {
      const res = await getSewingPlans({
        page,
        limit,
        search,
        date,
        exclude_lists: excludeLists,
        exclude_list_name_like: excludeListNameLike,
        include_lists: includeLists,
      });
      return (
        res.data ?? {
          items: [],
          total: 0,
          page,
          limit,
          masterPlanner: null,
        }
      );
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useSewingPlanner = () => {
  return useQuery<SewingPlan[]>({
    queryKey: ["sewing-planner"],
    queryFn: async () => {
      const res = await getSewingPlanner();
      return res.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
};

import { useQuery } from "@tanstack/react-query";
import { getPlan, PlanFilterParam, PlanList } from "@api/plans";

export const usePlan = (
    plannerId: number | undefined,
    params: {
        page: number;
        limit: number;
        search?: string;
        date?: string;
        includeLists?: string[];
        filters?: PlanFilterParam[];
    }
) => {
    const { page, limit, search, date, includeLists, filters } = params;

    return useQuery<PlanList>({
        queryKey: ["plan", plannerId, page, limit, search, date, includeLists, filters],
        queryFn: async () => {
            if (!plannerId) {
                return {
                    items: [],
                    total: 0,
                    page,
                    limit,
                    master_planner: null,
                };
            }
            const res = await getPlan(plannerId, {
                page,
                limit,
                search,
                date,
                include_lists: includeLists,
                filters,
            });
            return (
                res.data ?? {
                    items: [],
                    total: 0,
                    page,
                    limit,
                    master_planner: null,
                }
            );
        },
        enabled: !!plannerId,
        staleTime: 2 * 60 * 1000,
    });
};

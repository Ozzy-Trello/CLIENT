import { useQuery } from "@tanstack/react-query";
import { getPlan, PlanList } from "@api/plans";

export const usePlan = (
    plannerId: number | undefined,
    params: {
        page: number;
        limit: number;
        search?: string;
        date?: string;
        includeLists?: string[];
    }
) => {
    const { page, limit, search, date, includeLists } = params;

    return useQuery<PlanList>({
        queryKey: ["plan", plannerId, page, limit, search, date, includeLists],
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

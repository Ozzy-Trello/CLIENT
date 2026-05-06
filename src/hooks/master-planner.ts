import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMasterPlanner,
  deleteMasterPlanner,
  getHardcodedMasterPlanner,
  getMasterPlanners,
  updateMasterPlanner,
} from "@api/master-planner";
import {
  MasterPlanner,
  MasterPlannerCreateRequest,
  MasterPlannerUpdateRequest,
} from "@myTypes/master-planner";

const queryKey = ["master-planner"];
const keepPrevious = <T,>(previous: T | undefined): T | undefined => previous;

export const useMasterPlanners = () => {
  return useQuery<MasterPlanner[]>({
    queryKey,
    queryFn: async () => {
      const response = await getMasterPlanners();
      return response.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateMasterPlanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MasterPlannerCreateRequest) => {
      const response = await createMasterPlanner(payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
};

export const useUpdateMasterPlanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: MasterPlannerUpdateRequest;
    }) => {
      const response = await updateMasterPlanner(id, payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
};

export const useDeleteMasterPlanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteMasterPlanner(id);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
};

export interface V2PlannerFilters {
  checkboxFilter?: string;
  qtyFilter?: string;
  presentFilter?: string;
  optionFilter?: string[];
  productFilter?: string[];
  dueDateValues?: string[];
  productionDateValues?: string[];
  listFilter?: string[];
}

export const useMasterPlannerV2 = (type: string, filters?: V2PlannerFilters) => {
  return useQuery({
    queryKey: ["master-planner-v2", type, filters],
    queryFn: async () => {
      if (!type) return null;
      const response = await getHardcodedMasterPlanner(type, filters);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!type,
    placeholderData: keepPrevious,
  });
};

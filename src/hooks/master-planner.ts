import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMasterPlanner,
  deleteMasterPlanner,
  getMasterPlanners,
  updateMasterPlanner,
} from "@api/master-planner";
import {
  MasterPlanner,
  MasterPlannerCreateRequest,
  MasterPlannerUpdateRequest,
} from "@myTypes/master-planner";

const queryKey = ["master-planner"];

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

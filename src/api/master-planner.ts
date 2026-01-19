import { api } from ".";
import { ApiResponse } from "@myTypes/api";
import {
  MasterPlanner,
  MasterPlannerCreateRequest,
  MasterPlannerUpdateRequest,
} from "@myTypes/master-planner";

export const getMasterPlanners = async (): Promise<ApiResponse<MasterPlanner[]>> => {
  const { data } = await api.get("/master-planner");
  return data;
};

export const getMasterPlanner = async (
  id: number
): Promise<ApiResponse<MasterPlanner>> => {
  const { data } = await api.get(`/master-planner/${id}`);
  return data;
};

export const createMasterPlanner = async (
  payload: MasterPlannerCreateRequest
): Promise<ApiResponse<MasterPlanner>> => {
  const { data } = await api.post("/master-planner", payload);
  return data;
};

export const updateMasterPlanner = async (
  id: number,
  payload: MasterPlannerUpdateRequest
): Promise<ApiResponse<MasterPlanner>> => {
  const { data } = await api.put(`/master-planner/${id}`, payload);
  return data;
};

export const deleteMasterPlanner = async (
  id: number
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/master-planner/${id}`);
  return data;
};

export const getHardcodedMasterPlanner = async (
  type: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.get(`/master-planner/v2/${type}`);
  return data;
};

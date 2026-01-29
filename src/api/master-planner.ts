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

export interface V2PlannerFilters {
  // Base filters (hidden, applied as defaults)
  checkboxFilter?: string;
  qtyFilter?: string;
  presentFilter?: string;
  optionFilter?: string[];
  // User-visible filters
  productFilter?: string[];
  dueDateValues?: string[];
  productionDateValues?: string[];
  listFilter?: string[];
}

export const getHardcodedMasterPlanner = async (
  type: string,
  filters?: V2PlannerFilters
): Promise<ApiResponse<any>> => {
  const params = new URLSearchParams();
  // Base filters (always sent to maintain defaults)
  if (filters?.checkboxFilter) params.append('checkboxFilter', filters.checkboxFilter);
  if (filters?.qtyFilter) params.append('qtyFilter', filters.qtyFilter);
  if (filters?.presentFilter) params.append('presentFilter', filters.presentFilter);
  if (filters?.optionFilter && filters.optionFilter.length > 0) {
    params.append('optionFilter', filters.optionFilter.join(','));
  }
  // User-visible filters
  if (filters?.productFilter && filters.productFilter.length > 0) {
    filters.productFilter.forEach((p) => params.append('productFilter', p));
  }
  if (filters?.dueDateValues && filters.dueDateValues.length > 0) {
    filters.dueDateValues.forEach((d) => params.append('dueDateValues', d));
  }
  if (filters?.productionDateValues && filters.productionDateValues.length > 0) {
    filters.productionDateValues.forEach((d) => params.append('productionDateValues', d));
  }
  if (filters?.listFilter && filters.listFilter.length > 0) {
    filters.listFilter.forEach((l) => params.append('listFilter', l));
  }
  const queryString = params.toString();
  const url = `/master-planner/v2/${type}${queryString ? `?${queryString}` : ''}`;
  const { data } = await api.get(url);
  return data;
};

import api from "../api";
import { ApiResponse, PostAutomationRule } from "../types/type";

export const createRule = async(rule: PostAutomationRule): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/trigger`, rule, 
      {headers: {"workspace-id": rule.workspaceId}}
    );
  return data;
}

export const getRule = async(rule: PostAutomationRule): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/trigger`, rule, 
      {headers: {"workspace-id": rule.workspaceId}}
    );
  return data;
}
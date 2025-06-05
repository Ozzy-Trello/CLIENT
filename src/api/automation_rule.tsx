import api from ".";
import { ApiResponse, AutomationRuleApiData } from "../types/type";

export const createRule = async(rule: AutomationRuleApiData): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/automation-rule`, rule, 
      {headers: {"workspace-id": rule.workspaceId}}
    );
  return data;
}

export const getRule = async(workspaceId: string): Promise<ApiResponse<any>> => {
  const { data } = await api.get(`/automation-rule`, 
      {headers: {"workspace-id": workspaceId}}
    );
  return data;
}
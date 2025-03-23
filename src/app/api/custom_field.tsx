import { api } from ".";
import { ApiResponse, CustomField } from "../dto/types";

export const customFields = async(workspaceId: string): Promise<ApiResponse<CustomField[]>> => {
  const {data} = await api.get("/custom-field", {headers: {'workspace-id': workspaceId}});
  return data;
}

export const createCustomField = async(customField: Partial<CustomField>, workspaceId: string): Promise<ApiResponse<any>> => {
  const {data} = await api.post("/custom-field", customField, {headers: {'workspace-id': workspaceId}});
  return data;
}

export const updateCustomField = async(customFieldId:string, customField: Partial<CustomField>): Promise<ApiResponse<any>> => {
  const {data} = await api.put(`/custom-field/${customFieldId}`, customField);
  return data;
}

export const deleteCustomField = async(customFieldId:string): Promise<ApiResponse<any>> => {
  const {data} = await api.delete(`/custom-field/${customFieldId}`);
  return data;
}
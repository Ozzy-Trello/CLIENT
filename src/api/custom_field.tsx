import { CustomField } from "@myTypes/custom-field";
import { api } from ".";
import { ApiResponse } from "../types/type";

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

export const reorderCustomFields = async(
  workspaceId: string, 
  reorderedIds: string[]
): Promise<ApiResponse<any>> => {
  const {data} = await api.put("/custom-field/reorder", 
    { customFieldIds: reorderedIds }, 
    { headers: {'workspace-id': workspaceId} }
  );
  return data;
};
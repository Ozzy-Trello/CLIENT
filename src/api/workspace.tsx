import { api } from ".";
import { ApiResponse } from "../types/type";
import { Workspace } from "../types/workspace";

export const workspaces = async(): Promise<ApiResponse<Workspace[]>> => {
  const { data } = await api.get("/workspace");
  return data;
}

export const workspaceDefault = async(): Promise<ApiResponse<Workspace>> => {
  const { data } = await api.get("/workspace/default");
  return data;
} 

export const workspaceDetails = async(workspaceId: string): Promise<ApiResponse<Workspace>> => {
  const { data } = await api.get(`/workspace/${workspaceId}`)
  return data;
}

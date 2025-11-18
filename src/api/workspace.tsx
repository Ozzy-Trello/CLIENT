import { api } from ".";
import { ApiResponse } from "../types/type";
import { Workspace } from "../types/workspace";

export interface CreateWorkspacePayload {
  name: string;
  slug: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
  description?: string;
  memberIds?: string[];
}

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

export const createWorkspace = async(
  payload: CreateWorkspacePayload
): Promise<ApiResponse<{ id: string }>> => {
  const { data } = await api.post("/workspace", payload);
  return data;
};

export const updateWorkspace = async (
  workspaceId: string,
  payload: UpdateWorkspacePayload
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/workspace/${workspaceId}`, payload);
  return data;
};

import { RoleResponse, SingleRoleResponse } from "@myTypes/role";
import { api } from "./index";

export const getRoles = async (workspaceId?: string): Promise<RoleResponse> => {
  const response = await api.get("/roles", {
    headers: workspaceId ? { "workspace-id": workspaceId } : {},
  });
  return response.data;
};

export const getRole = async (id: string): Promise<SingleRoleResponse> => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

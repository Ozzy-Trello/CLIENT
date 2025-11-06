import { RoleResponse, SingleRoleResponse, Role } from "../types/role";
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

export const createRole = async (roleData: {
  name: string;
  description: string;
  design_access?: boolean;
}): Promise<SingleRoleResponse> => {
  const response = await api.post("/roles", roleData);
  return response.data;
};

export const updateRole = async (id: string, roleData: {
  name?: string;
  description?: string;
  design_access?: boolean;
}): Promise<SingleRoleResponse> => {
  const response = await api.put(`/roles/${id}`, roleData);
  return response.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await api.delete(`/roles/${id}`);
};

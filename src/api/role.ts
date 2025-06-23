import { ApiResponse } from "@dto/types";
import { Role } from "@myTypes/role";
import api from ".";

export const getRoles = async (
  workspaceId: string
): Promise<ApiResponse<Role[]>> => {
  const response = await api.get(`/workspace/${workspaceId}/roles`);
  return response.data;
};

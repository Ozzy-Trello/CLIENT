import { RoleResponse, SingleRoleResponse } from '@myTypes/role';
import { api } from './index';

export const getRoles = async (): Promise<RoleResponse> => {
  const response = await api.get('/roles');
  return response.data;
};

export const getRole = async (id: string): Promise<SingleRoleResponse> => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

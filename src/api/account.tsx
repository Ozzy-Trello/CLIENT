import { api } from ".";
import { Account } from "../dto/account";
import { ApiResponse } from "../types/type";

export const currentAccount = async (): Promise<ApiResponse<Account>> => {
  const { data } = await api.get("/account");
  return data;
};

export const updateAccount = async (
  params: Partial<Account> & { password?: string }
): Promise<ApiResponse<Account>> => {
  const { data } = await api.put("/account", params);
  return data;
};

export const updateAccountById = async (
  userId: string,
  updates: Partial<Account & { roleIds?: string[] }>
): Promise<ApiResponse<Account>> => {
  const { data } = await api.patch(`/account/${userId}`, updates);
  return data;
};

export const accountList = async (
  workspaceId: string,
  boardId: string,
  roleIds: string[] = []
): Promise<ApiResponse<Account[]>> => {
  const params = new URLSearchParams();
  if (roleIds.length > 0) {
    params.append("roleIds", roleIds.join(","));
  }

  const { data } = await api.get(`/account/list?${params.toString()}`, {
    headers: { "workspace-id": workspaceId, "board-id": boardId },
  });
  return data as ApiResponse<Account[]>;
};

export const userDetails = async (
  userId: string
): Promise<ApiResponse<Account>> => {
  const { data } = await api.get(`/account/${userId}`);
  return data;
};

// create new account (admin)
export const createAccount = async (
  payload: Partial<Account> & { password: string; roleIds?: string[] }
): Promise<ApiResponse<Account>> => {
  const { data } = await api.post(`/account`, payload);
  return data;
};

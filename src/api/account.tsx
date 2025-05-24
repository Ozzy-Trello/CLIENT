import { api } from ".";
import { Account } from "../dto/account";
import { ApiResponse } from "../types/type";

export const currentAccount = async (): Promise<ApiResponse<Account>> => {
  const { data } = await api.get('/account');
  return data;
};

export const updateAccount = async(params: Account): Promise<ApiResponse<Account>> => {
  const { data } = await api.put('/account', params);
  return data;
}

export const accountList = async (workspaceId:string, boardId:string): Promise<ApiResponse<Account[]>> => {
  const { data } = await api.get('/account/list', 
    {headers: {"workspace-id": workspaceId, "board-id": boardId}}
  );
  return data;
};
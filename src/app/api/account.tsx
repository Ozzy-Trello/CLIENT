import { api } from ".";
import { Account } from "../dto/account";
import { ApiResponse } from "../dto/types";

export const currentAccount = async (): Promise<ApiResponse<Account>> => {
  const { data } = await api.get('/account');
  return data;
};

export const updateAccount = async(params: Account): Promise<ApiResponse<Account>> => {
  const { data } = await api.put('/account', params);
  return data;
}
import { api } from ".";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";

export const getCardMember = async (cardId: string): Promise<ApiResponse<User[]>> => {
  const {data} = await api.get(`/card/${cardId}/member`);
  return data;
}

export const addMember = async (cardId: string, userIds: []): Promise<ApiResponse<any>> => {
  const {data} = await api.post(`/card/${cardId}/member`, {userIds: userIds});
  return data;
}

export const removeMember = async (cardId: string, userId: string): Promise<ApiResponse<any>> => {
  const {data} = await api.delete(`/card/${cardId}/member/${userId}`);
  return data;
}
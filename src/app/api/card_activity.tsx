import { api } from ".";
import { CardActivity } from "../types/card";
import { ApiResponse } from "../types/type";

export const cardAcitivities = async (cardId: string): Promise<ApiResponse<CardActivity[]>> => {
  const {data} = await api.get(`/card/${cardId}/activity`);
  return data;
}
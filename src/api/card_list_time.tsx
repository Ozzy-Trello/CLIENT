import { api } from ".";
import { CardTimeInList } from "../types/card";
import { ApiResponse } from "../types/type";

export const getCardTimeInList = async (cardId: string): Promise<ApiResponse<CardTimeInList[]>> => {
  const {data} = await api.get(`/card/${cardId}/time-in-lists`);
  return data;
}
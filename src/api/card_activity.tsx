import { api } from ".";
import { CardActivity } from "../types/card";
import { ApiResponse } from "../types/type";

export const cardAcitivities = async (
  cardId: string,
  page = 1,
  limit = 10
): Promise<any> => {
  const { data } = await api.get(
    `/card/${cardId}/activity?page=${page}&limit=${limit}`
  );
  return data;
};

export const addCardActivity = async (
  cardId: string,
  payload: CardActivity
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/activity`, payload);
  return data;
};

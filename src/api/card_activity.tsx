import { api } from ".";
import { CardActivity } from "../types/card";
import { ApiResponse } from "../types/type";

export const cardAcitivities = async (
  cardId: string,
  page = 1,
  limit = 10,
  type?: "action" | "comment" | "all"
): Promise<any> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (type && type !== "all") {
    params.set("type", type);
  }

  const { data } = await api.get(
    `/card/${cardId}/activity?${params.toString()}`
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

export const updateCardActivityComment = async (
  cardId: string,
  activityId: string,
  text: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.patch(
    `/card/${cardId}/activity/${activityId}`,
    { comment: { text } }
  );
  return data;
};

export const deleteCardActivityComment = async (
  cardId: string,
  activityId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/card/${cardId}/activity/${activityId}`);
  return data;
};

import { ApiResponse, Card } from "../dto/types";
import { api } from ".";

export const cards = async (listId: string): Promise<ApiResponse<Card[]>> => {
  const {data} = await api.get("/card", {headers: {"list-id":listId}});
  return data;
}

export const createCard = async (card: Card): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card`, card);
  return data;
}

export const cardDetails = async (cardId: string): Promise<ApiResponse<Card>> => {
  const { data } = await api.get(`/card/${cardId}`);
  return data;
}
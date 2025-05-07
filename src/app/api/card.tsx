import { api } from ".";
import { ApiResponse, Card } from "../types/type";

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

export const moveCard = async (cardId: string, previousListId: string, targetListId: string, previousPosition: number, targetPosition: number): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/move`, { cardId, previousListId, targetListId, previousPosition, targetPosition});
  return data;
}
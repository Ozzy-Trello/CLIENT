import { api } from ".";
import { Card } from "../types/card";
import { ApiResponse } from "../types/type";

export const cards = async (listId: string, boardId: string): Promise<ApiResponse<Card[]>> => {
  const {data} = await api.get("/card", {headers: {"list-id":listId, "board-id": boardId}});
  return data;
}

export const searchCards = async (params: any): Promise<ApiResponse<Card[]>> => {
  const {data} = await api.get("/card/search", {params: params});
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

export const updateCard = async (cardId: string, dataToUpdate: Partial<Card>): Promise<ApiResponse<Card>> => {
  const { data } = await api.put(`/card/${cardId}`, dataToUpdate);
  return data;
}

export const moveCard = async (cardId: string, previousListId: string, targetListId: string, previousPosition: number, targetPosition: number): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/move`, { cardId, previousListId, targetListId, previousPosition, targetPosition});
  return data;
}

export const cardCount = async (cardId: string): Promise<ApiResponse<any>> => {
  const {data} = await api.get(`/card/${cardId}/dashcard/count`);
  return data;
}
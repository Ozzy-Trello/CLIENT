import { api } from ".";
import { ApiResponse } from "../types/type";

export interface CardAccessory {
  id: string;
  cardId: string;
  accessoryId: string;
  accessoryName: string;
  description: string | null;
  isDone: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardAccessoryCreateRequest {
  accessoryId: string;
  description?: string;
}

export interface CardAccessoryUpdateRequest {
  description?: string | null;
  isDone?: boolean;
}

// Get all accessories for a card
export const getCardAccessories = async (
  cardId: string
): Promise<ApiResponse<CardAccessory[]>> => {
  const { data } = await api.get(`/cards/${cardId}/accessories`);
  return data;
};

// Create card accessory
export const createCardAccessory = async (
  cardId: string,
  payload: CardAccessoryCreateRequest
): Promise<ApiResponse<CardAccessory>> => {
  const { data } = await api.post(`/cards/${cardId}/accessories`, payload);
  return data;
};

// Update card accessory
export const updateCardAccessory = async (
  id: string,
  updates: CardAccessoryUpdateRequest
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/card-accessories/${id}`, updates);
  return data;
};

// Delete card accessory
export const deleteCardAccessory = async (
  id: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/card-accessories/${id}`);
  return data;
};

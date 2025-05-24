import { api } from "./index";
import type { 
  AdditionalFieldDTO, 
  AdditionalFieldItem, 
  AdditionalFieldResponse,
  AdditionalFieldsResponse
} from "../types/additional-field";

/**
 * Get all additional fields for a specific card
 */
export const getAdditionalFieldsByCardId = async (cardId: string): Promise<AdditionalFieldsResponse> => {
  const { data } = await api.get(`/additional-field/card/${cardId}`);
  return data;
};

/**
 * Get a specific additional field by ID
 */
export const getAdditionalFieldById = async (id: string): Promise<AdditionalFieldResponse> => {
  const { data } = await api.get(`/additional-field/${id}`);
  return data;
};

/**
 * Create a new additional field
 */
export const createAdditionalField = async (card_id: string, data: any): Promise<AdditionalFieldResponse> => {
  const { data: responseData } = await api.post("/additional-field", {
    card_id,
    data: JSON.stringify(data)
  });
  return responseData;
};

/**
 * Update an existing additional field
 */
export const updateAdditionalField = async (id: string, data: any): Promise<AdditionalFieldResponse> => {
  const { data: responseData } = await api.put(`/additional-field/${id}`, {
    data: JSON.stringify(data)
  });
  return responseData;
};

/**
 * Delete an additional field
 */
export const deleteAdditionalField = async (id: string): Promise<AdditionalFieldResponse> => {
  const { data } = await api.delete(`/additional-field/${id}`);
  return data;
};

/**
 * Update a specific item in an additional field
 */
export const updateAdditionalFieldItem = async (
  id: string, 
  itemId: string, 
  itemData: Partial<AdditionalFieldItem>
): Promise<AdditionalFieldResponse> => {
  const { data } = await api.patch(`/additional-field/${id}/item/${itemId}`, {
    data: JSON.stringify(itemData)
  });
  return data;
};

/**
 * Add a new item to an additional field
 */
export const addAdditionalFieldItem = async (
  id: string, 
  itemData: AdditionalFieldItem
): Promise<AdditionalFieldResponse> => {
  const { data } = await api.post(`/additional-field/${id}/item`, {
    data: JSON.stringify(itemData)
  });
  return data;
};

/**
 * Remove an item from an additional field
 */
export const removeAdditionalFieldItem = async (
  id: string, 
  itemId: string
): Promise<AdditionalFieldResponse> => {
  const { data } = await api.delete(`/additional-field/${id}/item/${itemId}`);
  return data;
};

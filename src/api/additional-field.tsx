import { api } from "./index";
import type {
  AdditionalFieldDTO,
  AdditionalFieldItem,
  AdditionalFieldResponse,
  AdditionalFieldsResponse,
} from "../types/additional-field";

/**
 * Get all additional fields for a specific card
 */
export const getAdditionalFieldsByCardId = async (
  cardId: string
): Promise<AdditionalFieldsResponse> => {
  const { data } = await api.get(`/additional-field/card/${cardId}`);
  return data;
};

/**
 * Get a specific additional field by ID
 */
export const getAdditionalFieldById = async (
  id: string
): Promise<AdditionalFieldResponse> => {
  const { data } = await api.get(`/additional-field/${id}`);
  return data;
};

/**
 * Create a new additional field
 */
export const createAdditionalField = async (
  card_id: string,
  data: any
): Promise<AdditionalFieldResponse> => {
  // Use camelCase for the payload so the axios interceptor converts it to snake_case correctly
  const payload = {
    cardId: card_id, // This will be converted to card_id by the interceptor
    data: JSON.stringify(data),
  };
  
  console.log("=== CREATE ADDITIONAL FIELD DEBUG ===");
  console.log("card_id:", card_id);
  console.log("data:", data);
  console.log("payload before interceptor:", payload);
  console.log("=== END DEBUG ===");
  
  const { data: responseData } = await api.post("/additional-field", payload);
  return responseData;
};

/**
 * Update an existing additional field
 */
export const updateAdditionalField = async (
  id: string,
  data: any
): Promise<AdditionalFieldResponse> => {
  const { data: responseData } = await api.put(`/additional-field/${id}`, {
    data: JSON.stringify(data),
  });
  return responseData;
};

/**
 * Delete an additional field
 */
export const deleteAdditionalField = async (
  id: string
): Promise<AdditionalFieldResponse> => {
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
    data: JSON.stringify(itemData),
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
    data: JSON.stringify(itemData),
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

/**
 * Scan QR code and update item status
 * Can also be used for manual ID input by passing the ID as scannedData
 * Updated to use new endpoint structure with cardId as URL parameter
 */
export const scanQRCode = async (
  cardId: string,
  scannedData: string,
  action: "mark_complete" | "mark_pending" | "toggle_status" = "mark_complete"
): Promise<any> => {
  const { data } = await api.post(`/additional-field/${cardId}/scan`, {
    scanned_data: scannedData,
    action,
  });
  return data;
};

/**
 * Manual input of bahan ID (number) - uses same API as scanning
 */
export const manualInputBahanId = async (
  cardId: string,
  bahanId: number,
  action: "mark_complete" | "mark_pending" | "toggle_status" = "mark_complete"
): Promise<any> => {
  return scanQRCode(cardId, bahanId.toString(), action);
};

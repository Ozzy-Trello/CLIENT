import { api } from ".";
import { ApiResponse } from "../types/type";

export interface POItem {
  id: string;
  poId: string;
  qrCode: string;
  size?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface POItemsResponse {
  items: POItem[];
  total: number;
}

// Get PO items by PO ID
export const getPOItemsByPOId = async (poId: string): Promise<ApiResponse<POItemsResponse>> => {
  const { data } = await api.get(`/po-item`, {
    params: { po_id: poId }
  });
  return data;
};

// Get PO items by card ID (all PO items for all POs in a card)
export const getPOItemsByCardId = async (cardId: string): Promise<ApiResponse<POItemsResponse>> => {
  const { data } = await api.get(`/po-item`, {
    params: { card_id: cardId }
  });
  return data;
};

// Get single PO item by ID
export const getPOItem = async (itemId: string): Promise<ApiResponse<POItem>> => {
  const { data } = await api.get(`/po-item/${itemId}`);
  return data;
};

// Get PO item by QR code
export const getPOItemByQRCode = async (qrCode: string): Promise<ApiResponse<POItem>> => {
  const { data } = await api.get(`/po-item/qr/${qrCode}`);
  return data;
};

// Create a single PO item
export const createPOItem = async (poItemData: {
  poId: string;
  qrCode?: string;
  size?: string;
}): Promise<ApiResponse<POItem>> => {
  // Axios interceptor will automatically convert camelCase to snake_case
  const { data } = await api.post("/po-item", poItemData);
  return data;
};

// Update a PO item
export const updatePOItem = async (itemId: string, updateData: {
  qrCode?: string;
  size?: string;
}): Promise<ApiResponse<POItem>> => {
  // Axios interceptor will automatically convert camelCase to snake_case
  const { data } = await api.put(`/po-item/${itemId}`, updateData);
  return data;
};

// Delete a PO item
export const deletePOItem = async (itemId: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/po-item/${itemId}`);
  return data;
};

// Scan QR code for PO item
export const scanPOItemQRCode = async (qrCode: string): Promise<ApiResponse<any>> => {
  const { data } = await api.post("/po-item/scan", { qr_code: qrCode });
  return data;
};
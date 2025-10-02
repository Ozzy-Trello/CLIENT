import { api } from ".";
import { ApiResponse } from "../types/type";
import { POItem } from './po-items';

// Keep SizeQuantity for backward compatibility with additional fields
export interface SizeQuantity {
  [size: string]: number;
}

export interface PO {
  id: string;
  cardId: string;
  poNumber: string;
  createdAt: Date;
  updatedAt: Date;
  items?: POItem[];
}

export interface CreatePORequest {
  card_id: string;
  po_number: string;
  quantity?: number; // Optional for backward compatibility
  size_assignments?: SizeQuantity; // New field for size-based assignments
}

export interface UpdatePORequest {
  po_number?: string;
  quantity?: number; // For legacy quantity updates
  size_assignments?: SizeQuantity; // For size-based updates
}

// Get POs by card ID
export const getPOsByCardId = async (cardId: string): Promise<ApiResponse<PO[]>> => {
  const { data } = await api.get(`/po`, {
    params: { card_id: cardId }
  });
  return data;
};

// Get a single PO by ID
export const getPOById = async (poId: string): Promise<ApiResponse<PO>> => {
  const { data } = await api.get(`/po/${poId}`);
  return data;
};

// Create a new PO
export const createPO = async (poData: CreatePORequest): Promise<ApiResponse<PO>> => {
  const { data } = await api.post("/po", poData);
  return data;
};

// Update an existing PO
export const updatePO = async (poId: string, updateData: UpdatePORequest): Promise<ApiResponse<PO>> => {
  const { data } = await api.put(`/po/${poId}`, updateData);
  return data;
};

// Delete a PO
export const deletePO = async (poId: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/po/${poId}`);
  return data;
};

// Auto-create POs for a card
export const autoCreatePOs = async (cardId: string): Promise<ApiResponse<PO[]>> => {
  const { data } = await api.post(`/po/auto-create`, { card_id: cardId });
  return data;
};
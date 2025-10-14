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

// Utility function to calculate total quantity from PO items
export const getPOTotalQuantity = (po: PO): number => {
  if (!po.items || po.items.length === 0) {
    return 0;
  }
  return po.items.reduce((total, item) => total + (item.quantity || 0), 0);
};

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

// Scan progress item for a PO
export interface ScanProgressItem {
  id: string;
  size: string;
  itemNumber: number;
  quantity: number;
  qrCode: string;
  scanned: boolean;
  scannedAt?: string | Date;
  scannedBy?: string;
}

// Scan progress response for a PO
export interface ScanProgressResponse {
  data: {
    scanned: number;
    total: number;
    percentage: number;
    items: ScanProgressItem[];
  }
}

// Request body for scanning a PO item
export interface ScanPOItemRequest {
  qrCode: string;
}

// Response type for scanning a PO item
export interface ScanPOItemResponse {
  message?: string;
  success?: boolean;
  data?: any;
}

// Get POs by card ID
export const getPOsByCardId = async (cardId: string): Promise<ApiResponse<PO[]>> => {
  const { data } = await api.get(`/po`, {
    params: { 
      card_id: cardId,
      limit: 1000 // Set high limit to get all POs for the card
    }
  });
  return data;
};

// Get a single PO by ID
export const getPOById = async (poId: string): Promise<ApiResponse<PO>> => {
  const { data } = await api.get(`/po/${poId}`);
  return data;
};

// Get scan progress for a single PO
export const getPOScanProgress = async (
  poId: string
): Promise<ApiResponse<ScanProgressResponse>> => {
  const { data } = await api.get(`/po/${poId}/scan-progress`);
  return data;
};

// Scan a PO item by QR code
export const scanPOItem = async (
  payload: ScanPOItemRequest
): Promise<ApiResponse<ScanPOItemResponse>> => {
  // Backend expects `qr_code` in body; interceptor converts camelCase to snake_case
  const { data } = await api.post(`/po/scan`, payload);
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
  console.log(`🔧 [autoCreatePOs] Starting API call for cardId: ${cardId}`);
  console.log(`🔧 [autoCreatePOs] Endpoint: /po/auto-create/${cardId}`);
  
  try {
    const { data } = await api.post(`/po/auto-create/${cardId}`);
    console.log(`🔧 [autoCreatePOs] API call successful:`, data);
    return data;
  } catch (error) {
    console.error(`🔧 [autoCreatePOs] API call failed:`, error);
    console.error(`🔧 [autoCreatePOs] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      response: (error as any)?.response?.data,
      status: (error as any)?.response?.status,
      config: (error as any)?.config
    });
    throw error;
  }
};
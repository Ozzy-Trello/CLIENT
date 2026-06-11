import { api } from ".";
import { ApiResponse } from "../types/type";
import { POItem } from './po-items';

// Keep SizeQuantity for backward compatibility with additional fields
export interface SizeQuantity {
  [size: string]: number;
}

export interface POSubcategory {
  id: string;
  poId: string;
  subcategoryId: string;
  subcategory?: {
    id: string;
    name: string;
  };
  items?: POItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PO {
  id: string;
  cardId: string;
  poNumber: string;
  createdAt: Date;
  updatedAt: Date;
  items?: POItem[];
  subcategories?: POSubcategory[]; // NEW: Subcategories with their items
}

// Utility function to calculate total quantity from PO items
export const getPOTotalQuantity = (po: PO): number => {
  if (!po.items || po.items.length === 0) {
    return 0;
  }
  return po.items.reduce((total, item) => total + (item.quantity || 0), 0);
};

export interface SubcategoryAssignment {
  subcategoryId: string;
  sizeAssignments: SizeQuantity;
}

export interface CreatePORequest {
  card_id: string;
  po_number: string;
  quantity?: number; // Optional for backward compatibility
  size_assignments?: SizeQuantity; // Deprecated - use subcategoryAssignments
  subcategoryAssignments?: SubcategoryAssignment[]; // NEW: For subcategory-based assignments
}

export interface UpdatePORequest {
  po_number?: string;
  quantity?: number; // For legacy quantity updates
  size_assignments?: SizeQuantity; // Deprecated - use subcategoryAssignments
  subcategoryAssignments?: SubcategoryAssignment[]; // NEW: For subcategory-based updates
}

// Scan progress item for a PO
export interface ScanProgressItem {
  id: string;
  size: string;
  itemNumber: number;
  item_number?: number; // snake_case from backend
  quantity: number;
  qrCode: string;
  qr_code?: string; // snake_case from backend
  scanned: boolean;
  scannedAt?: string | Date;
  scanned_at?: string | Date; // snake_case from backend
  scannedBy?: string; // User ID
  scanned_by?: string; // User ID (snake_case from backend)
  scannedByName?: string; // User name from backend
  scanned_by_name?: string; // User name (snake_case from backend)
  subcategoryName?: string; // Subcategory name from backend
  subcategory_name?: string; // Subcategory name (snake_case from backend)
}

// Scan progress response for a PO
export interface ScanProgressResponse {
  scanned: number;
  total: number;
  percentage: number;
  items: ScanProgressItem[];
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
export const getPOsByCardId = async (
  cardId: string
): Promise<ApiResponse<PO[]>> => {
  try {
    const { data, status } = await api.get(`/po`, {
      params: { card_id: cardId },
    });

    if (status === 204 || !data) {
      return { status_code: 200, message: "No POs found", data: [] } as ApiResponse<PO[]>;
    }

    return data;
  } catch (error: any) {
    if (error?.response?.status === 204) {
      return { status_code: 200, message: "No POs found", data: [] } as ApiResponse<PO[]>;
    }
    throw error;
  }
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

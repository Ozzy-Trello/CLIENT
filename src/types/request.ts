export type BeliStatus = "Ya" | "Tidak" | "";

export const DEFAULT_BELI_STATUS: BeliStatus = "Tidak";

export interface ApiResponse<T> {
  data: T[];
  pagination?: {
    total: number;
  };
}

export interface RequestItem {
  id: string;
  cardName: string;
  cardId?: string;
  card_id?: string;
  card_location?: string | null;
  cardLocation?: string | null;
  card_labels?: string[];
  cardLabels?: string[];
  listId?: string | null;
  list_id?: string | null;
  po_product_id?: string | null;
  po_product_category_id?: string | null;
  boardId?: string;
  board_id?: string;
  workspaceId?: string;
  workspace_id?: string;
  cabang?: string | null;
  location?: string | null;
  requestType: string;
  itemName: string;
  requestAmount: number;
  adjustmentName: string;
  description: string;
  requestSent?: number;
  isVerified?: boolean;
  productionReceived?: boolean;
  productionRecieved?: boolean;
  warehouseReturned?: boolean;
  warehouseFinalUsedAmount?: number;
  requestReceived?: number;
  requestLeft?: number;
  request_left?: number;
  type?: string;
  beli?: BeliStatus;
  invoice_no?: string;
  invoiceNo?: string;
  // Support both naming conventions during transition
  is_rejected?: boolean;
  isRejected?: boolean;
  is_done?: boolean;
  isDone?: boolean;
  satuan?: string;
  sentBy?: string;
  receivedBy?: string;
  sentByName?: string;
  receivedByName?: string;
  createdAt?: string;
  estBahan?: number | null;
  est_bahan?: number | null;
  efisiensi?: number | null;
}

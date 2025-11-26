export interface ApiResponse<T> {
  data: T[];
  pagination?: {
    total: number;
  };
}

export interface RequestItem {
  id: string;
  cardName: string;
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
  beli?: boolean;
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
}

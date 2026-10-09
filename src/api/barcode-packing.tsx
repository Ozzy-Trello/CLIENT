import { api } from "./index";
import { ApiResponse } from "../types/type";

export interface BarcodePacking {
  id: string;
  cardId: string;
  packNumber: number;
  totalPack: number;
  qty: number;
  qrCode: string;
  printed: boolean;
  deliveredAt: string | null;
  deliveredBy: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
}

export interface BarcodePackingScanResponse {
  pack: BarcodePacking;
  progress: { total: number; delivered: number; received: number };
}

export const issueBarcodePacking = async (
  cardId: string,
  packs: { qty: number }[],
): Promise<ApiResponse<BarcodePacking[]>> => {
  const { data } = await api.post("/packing/barcode", { cardId, packs });
  return data;
};

export const getBarcodePacking = async (
  cardId: string,
): Promise<ApiResponse<BarcodePacking[]>> => {
  const { data } = await api.get(`/packing/barcode/${cardId}`);
  return data;
};

export const printBarcodePacking = async (cardId: string) =>
  api.get(`/packing/barcode/${cardId}/print`, { responseType: "blob" });

export const scanPackDelivery = async (
  qrCode: string,
): Promise<ApiResponse<BarcodePackingScanResponse>> => {
  const { data } = await api.post("/packing/scan-delivery", { qrCode });
  return data;
};

export interface StartReceivingResponse {
  card: { id: string; name: string; list_name?: string };
  progress: { total: number; delivered: number; received: number };
}

export const startReceiving = async (
  cardId: string,
): Promise<ApiResponse<StartReceivingResponse>> => {
  const { data } = await api.get(`/packing/receiving/${cardId}`);
  return data;
};

export const scanPackReceived = async (
  qrCode: string,
  cardId: string,
): Promise<ApiResponse<BarcodePackingScanResponse>> => {
  const { data } = await api.post("/packing/scan-received", { qrCode, cardId });
  return data;
};

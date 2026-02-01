import { api } from ".";
import { ApiResponse } from "../types/type";

export interface QRCodeData {
  id: string;
  poId: string;
  qrCode: string;
  size: string;
  quantity: number;
  itemNumber: number;
  scanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRCodeResponse {
  qrCodes: QRCodeData[];
  totalCount: number;
}

// Get QR codes by card ID
export const getQRCodesByCardId = async (
  cardId: string
): Promise<ApiResponse<QRCodeResponse>> => {
  const { data } = await api.get(`/qr/codes/${cardId}`);
  return data;
};

// Generate QR codes PDF by card ID
export const generateQRCodesPDF = async (cardId: string): Promise<Blob> => {
  const response = await api.get(`/qr/pdf/${cardId}`, {
    responseType: "blob",
  });
  return response.data;
};

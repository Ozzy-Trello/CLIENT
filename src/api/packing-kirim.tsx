import { api } from "./index";
import { ApiResponse } from "../types/type";

export interface PackingKirimValidationResponse {
  cardId: string;
  cardName: string;
}

export const validatePackingKirim = async (
  cardId: string,
  scannedCardId: string,
): Promise<ApiResponse<PackingKirimValidationResponse>> => {
  const { data } = await api.post("/packing-kirim/validate", {
    cardId,
    scannedCardId,
  });
  return data;
};

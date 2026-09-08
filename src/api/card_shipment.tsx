import { api } from ".";
import { ApiResponse } from "@myTypes/type";

export interface CardShipment {
  id: string;
  cardId: string;
  waybillId: string;
  ekspedisiOptionValue: string;
  ekspedisiLabel: string;
  courierCode: string | null;
  courierServiceCode: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveCardShipmentPayload {
  waybillId: string;
  ekspedisiOptionValue: string;
}

export const getCardShipment = async (
  cardId: string,
): Promise<ApiResponse<CardShipment | null>> => {
  const { data } = await api.get(`/card/${cardId}/shipment`);
  return data;
};

export const saveCardShipment = async (
  cardId: string,
  payload: SaveCardShipmentPayload,
): Promise<ApiResponse<CardShipment | null>> => {
  const { data } = await api.put(`/card/${cardId}/shipment`, payload);
  return data;
};

export const deleteCardShipment = async (
  cardId: string,
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/card/${cardId}/shipment`);
  return data;
};

import { api } from ".";
import { ApiResponse } from "@myTypes/type";

export interface CardShipment {
  id: string;
  card_id: string;
  waybill_id: string;
  ekspedisi_option_value: string;
  ekspedisi_label: string;
  courier_code: string | null;
  courier_service_code: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface SaveCardShipmentPayload {
  waybill_id: string;
  ekspedisi_option_value: string;
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

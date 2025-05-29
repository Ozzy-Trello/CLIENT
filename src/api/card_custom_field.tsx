import { CardCustomField } from "@myTypes/card";
import { api } from ".";
import { ApiResponse } from "../types/type";

export const cardCustomFields = async (cardId: string, workspaceId: string): Promise<ApiResponse<CardCustomField[]>> => {
  const {data} = await api.get(`/card/${cardId}/custom-field`, { headers: { 'workspace-id': workspaceId } });
  return data;
}
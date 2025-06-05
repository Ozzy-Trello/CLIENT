import { CardCustomField } from "@myTypes/card";
import { api } from ".";
import { ApiResponse } from "../types/type";

export const cardCustomFields = async (
  cardId: string,
  workspaceId: string
): Promise<ApiResponse<CardCustomField[]>> => {
  const { data } = await api.get(`/card/${cardId}/custom-field`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const setCardCustomFieldValue = async (
  workspaceId: string,
  cardId: string,
  customFieldId: string,
  updatedData: Partial<CardCustomField>
): Promise<ApiResponse<CardCustomField[]>> => {
  const { data } = await api.post(
    `/card/${cardId}/custom-field/${customFieldId}`,
    updatedData,
    { headers: { "workspace-id": workspaceId } }
  );
  return data;
};

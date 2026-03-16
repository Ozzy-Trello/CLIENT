import { CardCustomField } from "@myTypes/card";
import { api } from ".";
import { ApiResponse } from "../types/type";
import { mapCustomFieldToFrontend } from "./card";

export const cardCustomFields = async (
  cardId: string,
  workspaceId: string
): Promise<ApiResponse<CardCustomField[]>> => {
  const { data } = await api.get(`/card/${cardId}/custom-field`, {
    headers: { "workspace-id": workspaceId },
  });

  if (Array.isArray(data.data)) {
    data.data = data.data.map(mapCustomFieldToFrontend);
  }

  return data;
};

export const setCardCustomFieldValue = async (
  workspaceId: string,
  cardId: string,
  customFieldId: string,
  updatedData: Partial<CardCustomField>
): Promise<ApiResponse<CardCustomField[]>> => {
  const payload: Record<string, any> = {
    ...updatedData,
  };

  if (Object.prototype.hasOwnProperty.call(updatedData, "valueString")) {
    payload.value_string = (updatedData as any).valueString;
  }
  if (Object.prototype.hasOwnProperty.call(updatedData, "valueNumber")) {
    payload.value_number = (updatedData as any).valueNumber;
  }
  if (Object.prototype.hasOwnProperty.call(updatedData, "valueCheckbox")) {
    payload.value_checkbox = (updatedData as any).valueCheckbox;
  }
  if (Object.prototype.hasOwnProperty.call(updatedData, "valueOption")) {
    payload.value_option = (updatedData as any).valueOption;
  }
  if (Object.prototype.hasOwnProperty.call(updatedData, "valueDate")) {
    payload.value_date = (updatedData as any).valueDate;
  }
  if (Object.prototype.hasOwnProperty.call(updatedData, "valueUserId")) {
    payload.value_user_id = (updatedData as any).valueUserId;
  }

  const { data } = await api.post(
    `/card/${cardId}/custom-field/${customFieldId}`,
    payload,
    { headers: { "workspace-id": workspaceId } }
  );

  if (Array.isArray(data.data)) {
    data.data = data.data.map(mapCustomFieldToFrontend);
  }

  return data;
};

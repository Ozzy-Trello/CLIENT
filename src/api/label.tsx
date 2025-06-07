import { api } from ".";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";
import { CardLabel, Label } from "@myTypes/label";
import snakecaseKeys from "snakecase-keys";

export const createLabel = async (label: Label): Promise<ApiResponse<any>> => {
  const {data} = await api.post(`/label`, label);
  return data;
}

export const getLabels = async (workspaceId: string, params: CardLabel): Promise<ApiResponse<CardLabel[]>> => {
  params = snakecaseKeys(params as any, { deep: true });
  const queryParams = new URLSearchParams(params as any).toString();
  const {data} = await api.get(`/label?${queryParams}`, {headers: {"workspace-id": workspaceId}});
  return data;
}


export const updateLabel = async (labelId: string, label: Label): Promise<ApiResponse<any>> => {
  const {data} = await api.put(`/label/${labelId}`, label);
  return data;
}

export const deleteLabel = async (labelId: string): Promise<ApiResponse<any>> => {
  const {data} = await api.delete(`/label/${labelId}`);
  return data;
}

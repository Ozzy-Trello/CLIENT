import { api } from ".";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";
import { CardLabel, Label, LabelAttributes } from "@myTypes/label";
import snakecaseKeys from "snakecase-keys";

export const createLabel = async (label: Label): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/label`, label);
  return data;
};

export const getLabels = async (
  workspaceId: string,
  params: CardLabel
): Promise<ApiResponse<CardLabel[]>> => {
  const cleaned = Object.fromEntries(
    Object.entries(snakecaseKeys(params as any, { deep: true })).filter(
      ([_, v]) => v !== undefined && v !== null && v !== ""
    )
  );

  // 🚀 If no query params → just return empty array, skip API
  if (Object.keys(cleaned).length === 0) {
    return { data: [] } as ApiResponse<CardLabel[]>;
  }

  const queryParams = new URLSearchParams(cleaned as any).toString();

  const { data } = await api.get(`/label?${queryParams}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const updateLabel = async (
  labelId: string,
  label: Label
): Promise<ApiResponse<any>> => {
  const { data } = await api.put(`/label/${labelId}`, label);
  return data;
};

export const deleteLabel = async (
  labelId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/label/${labelId}`);
  return data;
};

export const getWorkspaceLabels = async (
  workspaceId: string,
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<ApiResponse<LabelAttributes[]>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });

  const { data } = await api.get(`/label/workspace/paginated?${params}`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const getAllLabels = async (
  workspaceId: string
): Promise<ApiResponse<LabelAttributes[]>> => {
  const { data } = await api.get(`/label/workspace`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const labelDetails = async (
  labelId: string
): Promise<ApiResponse<LabelAttributes>> => {
  const { data } = await api.get(`/label/${labelId}`);
  return data;
};

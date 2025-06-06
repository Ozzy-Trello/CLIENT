import { api } from ".";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";
import { Label } from "@myTypes/label";


export const createLabel = async (label: Label): Promise<ApiResponse<any>> => {
  const {data} = await api.post(`/label`, label);
  return data;
}

export const getLabels = async (): Promise<ApiResponse<User[]>> => {
  const {data} = await api.get(`/label`);
  return data;
}

export const getLabel = async (labelId: string): Promise<ApiResponse<User[]>> => {
  const {data} = await api.get(`/label/${labelId}`);
  return data;
}

import { api } from ".";
import { ApiResponse, Trigger } from "../dto/types";

export const triggers = async(): Promise<ApiResponse<Trigger[]>> => {
  const { data } = await api.get("/trigger");
  return data;
}
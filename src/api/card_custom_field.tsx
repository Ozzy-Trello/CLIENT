import { api } from ".";
import { ApiResponse, CustomField } from "../types/type";

export const cardCustomFields = async (cardId: string): Promise<ApiResponse<CustomField[]>> => {
  const {data} = await api.get(`/card/${cardId}`);
  return data;
}
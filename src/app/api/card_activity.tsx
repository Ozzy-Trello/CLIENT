import { api } from ".";
import { ApiResponse, CardActivity} from "../dto/types";

export const cardAcitivities = async (cardId: string): Promise<ApiResponse<CardActivity[]>> => {
  const {data} = await api.get(`/card/${cardId}/activity`);
  return data;
}
import { api } from ".";
import { ApiResponse } from "@myTypes/type";
import { Priority } from "@myTypes/priority";

export const getPriorities = async (): Promise<ApiResponse<Priority[]>> => {
  const { data } = await api.get("/priority");
  return data;
};

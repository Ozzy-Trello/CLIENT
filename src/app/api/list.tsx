import { api } from ".";
import { AnyList, ApiResponse } from "../dto/types";

export const lists = async(boardId: string): Promise<ApiResponse<AnyList[]>> => {
  const { data } = await api.get("/list", { headers: { 'board-id': boardId } });
  return data;
}

export const createList = async(list: AnyList): Promise<ApiResponse<any>> => {
  const { data } = await api.post('/list', list);
  return data;
}

// export const updateList = async (listId: string, list: AnyList): Promise<ApiResponse<any>> => {
//   const { data } = await api.post(`/list/${listId}`, list);
//   return data;
// }

export const updateList = async ({ listId, list }: { listId: string, list: AnyList }): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/list/${listId}`, list);
  return data;
}
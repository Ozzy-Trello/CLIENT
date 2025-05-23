import { api } from ".";
import { AnyList } from "../types/list";
import { ApiResponse } from "../types/type";

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

export const moveList = async (id: string, previousPosition: number, targetPosition: number, boardId: string): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/list/${id}/move`, { id, previousPosition, targetPosition, boardId});
  return data;
}
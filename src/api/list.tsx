import { api } from ".";
import { AnyList } from "../types/list";
import { ApiResponse } from "../types/type";

export const lists = async (
  boardId: string
): Promise<ApiResponse<AnyList[]>> => {
  const { data } = await api.get("/list", { headers: { "board-id": boardId } });
  return data;
};

export const createList = async (list: AnyList): Promise<ApiResponse<any>> => {
  const { data } = await api.post("/list", list);
  return data;
};

// export const updateList = async (listId: string, list: AnyList): Promise<ApiResponse<any>> => {
//   const { data } = await api.post(`/list/${listId}`, list);
//   return data;
// }

export const updateList = async ({
  listId,
  list,
}: {
  listId: string;
  list: AnyList;
}): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/list/${listId}`, list);
  return data;
};

export const moveList = async (
  id: string,
  previousPosition: number,
  targetPosition: number,
  boardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/list/${id}/move`, {
    id,
    previousPosition,
    targetPosition,
    boardId,
  });
  return data;
};

export const listDetails = async (
  listId: string
): Promise<ApiResponse<AnyList>> => {
  const { data } = await api.get(`/list/${listId}`);
  return data;
};

export const deleteList = async (
  listId: string,
  boardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/list/${listId}`, {
    headers: { "board-id": boardId },
  });
  return data;
};

// Archive a list (remove it from active board view)
export const archiveList = async (
  listId: string,
  boardId: string
): Promise<ApiResponse<{ archived: boolean }>> => {
  const { data } = await api.post(
    `/list/${listId}/archive`,
    {},
    { headers: { "board-id": boardId } }
  );
  return data;
};

// Unarchive a list (restore it to active board view)
export const unarchiveList = async (
  listId: string,
  boardId: string
): Promise<ApiResponse<{ unarchived: boolean }>> => {
  const { data } = await api.post(
    `/list/${listId}/unarchive`,
    {},
    { headers: { "board-id": boardId } }
  );
  return data;
};

// Move all cards from one list to another
export const moveAllCardsInList = async (
  sourceListId: string,
  targetListId: string
): Promise<ApiResponse<{ moved_count: number }>> => {
  const { data } = await api.post(`/list/${sourceListId}/cards/move`, {
    targetListId,
  });
  return data;
};

// Sort cards in a list by a given field/direction
export const sortListCards = async (
  listId: string,
  sortBy: "name" | "createdAt" | "updatedAt" | "dueDate" | "position",
  direction: "asc" | "desc"
): Promise<ApiResponse<{ sorted: boolean }>> => {
  const { data } = await api.post(`/list/${listId}/sort-cards`, {
    sortBy,
    direction,
  });
  return data;
};

import { api } from ".";
import { Card, CopycardPost, ListDashcardDataResponse } from "../types/card";
import { ApiResponse } from "../types/type";

export const cards = async (
  listId: string,
  boardId: string
): Promise<ApiResponse<Card[]>> => {
  const { data } = await api.get("/card", {
    headers: { "list-id": listId, "board-id": boardId },
  });
  return data;
};

export const searchCards = async (
  params: any
): Promise<ApiResponse<Card[]>> => {
  const { data } = await api.get("/card/search", { params: params });
  return data;
};

export const createCard = async (card: Card): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card`, card);
  return data;
};

export const cardDetails = async (
  cardId: string,
  boardId: string
): Promise<ApiResponse<Card>> => {
  const { data } = await api.get(`/card/${cardId}`, {
    headers: { "board-id": boardId },
  });
  return data;
};

export const updateCard = async (
  cardId: string,
  dataToUpdate: Partial<Card>
): Promise<ApiResponse<Card>> => {
  const { data } = await api.put(`/card/${cardId}`, dataToUpdate);
  return data;
};

export const moveCard = async (
  cardId: string,
  previousListId: string,
  targetListId: string,
  previousPosition: number,
  targetPosition: number
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/move`, {
    cardId,
    previousListId,
    targetListId,
    previousPosition,
    targetPosition,
  });
  return data;
};

export const copyCard = async (
  cardId: string,
  copyCardData: CopycardPost
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/copy`, copyCardData);
  return data;
};

export const cardCount = async (
  cardId: string,
  workspaceId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.get(
    `/card/${cardId}/dashcard/count/${workspaceId}`
  );
  return data;
};

export const cardArchive = async (
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/archive`);
  return data;
};

export const cardUnarchive = async (
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/unarchive`);
  return data;
};

/**
 * Card Label
 */
export const addCardLabel = async (
  workspaceId: string,
  labelId: string,
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(
    `/card/${cardId}/label`,
    { labelId: labelId },
    { headers: { "workspace-id": workspaceId } }
  );
  return data;
};

export const removeLabelFromCard = async (
  labelId: string,
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/card/${cardId}/label/${labelId}`);
  return data;
};

export const getCardLabels = async (
  workspaceId: string,
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.get(`/card/${cardId}/label`, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const getListDashcard = async (workspaceId: string, id: string) => {
  const { data } = await api.get(`/card/${id}/list-dashcard/${workspaceId}`);

  return data as ApiResponse<ListDashcardDataResponse>;
};

import { api } from ".";
import { Card, CopycardPost, ListDashcardDataResponse } from "../types/card";
import { ApiResponse } from "../types/type";

// Helper function to map backend response to frontend Card format
export const mapBackendCardToFrontend = (backendCard: any): Card => {
  const mapped: any = { ...backendCard };

  // Map backend snake_case to frontend camelCase
  if (backendCard.product_id !== undefined) {
    mapped.productId = backendCard.product_id;
  }
  if (backendCard.product_code_id !== undefined) {
    mapped.productCodeId = backendCard.product_code_id;
  }
  if (backendCard.bahan_id !== undefined) {
    mapped.bahanId = backendCard.bahan_id;
  }
  if (backendCard.warna_id !== undefined) {
    mapped.warnaId = backendCard.warna_id;
  }
  if (backendCard.product_info !== undefined) {
    mapped.productInfo = backendCard.product_info;
  }
  // Map product_code_info to frontend
  if (backendCard.product_code_info !== undefined) {
    mapped.productCodeInfo = backendCard.product_code_info;
  }
  if (backendCard.bahan_info !== undefined) {
    mapped.bahanInfo = backendCard.bahan_info;
  }
  if (backendCard.warna_info !== undefined) {
    mapped.warnaInfo = backendCard.warna_info;
  }
  if (backendCard.list_id !== undefined) {
    mapped.listId = backendCard.list_id;
  }
  if (backendCard.list_name !== undefined) {
    mapped.listName = backendCard.list_name;
  }
  if (backendCard.board_id !== undefined) {
    mapped.boardId = backendCard.board_id;
  }
  if (backendCard.board_name !== undefined) {
    mapped.boardName = backendCard.board_name;
  }
  if (backendCard.workspace_id !== undefined) {
    mapped.workspaceId = backendCard.workspace_id;
  }
  if (backendCard.workspace_name !== undefined) {
    mapped.workspaceName = backendCard.workspace_name;
  }
  if (backendCard.formatted_time_in_list !== undefined) {
    mapped.formattedTimeInList = backendCard.formatted_time_in_list;
  }
  if (backendCard.formatted_time_in_board !== undefined) {
    mapped.formattedTimeInBoard = backendCard.formatted_time_in_board;
  }

  return mapped;
};

// Helper function to map frontend Card data to backend format
const mapFrontendCardToBackend = (frontendCard: Partial<Card>): any => {
  const backendData: any = { ...frontendCard };

  // Map frontend camelCase to backend snake_case
  if (frontendCard.productId !== undefined) {
    backendData.product_id = frontendCard.productId;
    delete backendData.productId;
  }
  if (frontendCard.productCodeId !== undefined) {
    backendData.product_code_id = frontendCard.productCodeId;
    delete backendData.productCodeId;
  }
  if (frontendCard.bahanId !== undefined) {
    backendData.bahan_id = frontendCard.bahanId;
    delete backendData.bahanId;
  }
  if (frontendCard.warnaId !== undefined) {
    backendData.warna_id = frontendCard.warnaId;
    delete backendData.warnaId;
  }
  if (frontendCard.productInfo !== undefined) {
    backendData.product_info = frontendCard.productInfo;
    delete backendData.productInfo;
  }
  if (frontendCard.bahanInfo !== undefined) {
    backendData.bahan_info = frontendCard.bahanInfo;
    delete backendData.bahanInfo;
  }
  if (frontendCard.warnaInfo !== undefined) {
    backendData.warna_info = frontendCard.warnaInfo;
    delete backendData.warnaInfo;
  }
  // Ensure productCodeInfo is never sent back to backend on update
  if (frontendCard.productCodeInfo !== undefined) {
    delete backendData.productCodeInfo;
  }

  return backendData;
};

export const cards = async (
  listId: string,
  boardId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<Card[]>> => {
  const { data } = await api.get("/card", {
    headers: { "list-id": listId, "board-id": boardId },
    params: { page, limit },
  });

  // Map backend response to frontend format
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(mapBackendCardToFrontend);
  }

  return data;
};

export const searchCards = async (
  params: any
): Promise<ApiResponse<Card[]>> => {
  const { data } = await api.get("/card/search", { params: params });

  // Map backend response to frontend format
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(mapBackendCardToFrontend);
  }

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

  // Map backend response to frontend format
  if (data.data) {
    data.data = mapBackendCardToFrontend(data.data);
  }

  return data;
};

export const getCardByShortId = async (
  shortId: number
): Promise<ApiResponse<Card>> => {
  const { data } = await api.get(`/card/short/${shortId}`);

  // Map backend response to frontend format
  if (data.data) {
    data.data = mapBackendCardToFrontend(data.data);
  }

  return data;
};

export const updateCard = async (
  cardId: string,
  dataToUpdate: Partial<Card>
): Promise<ApiResponse<Card>> => {
  const headers: any = {};

  // Add list-id header only if listId is available and we're not just updating dashcard config
  // If only dashConfig is being updated, don't send list-id header to avoid "card is already on this list" error
  const isDashcardOnlyUpdate =
    dataToUpdate.dashConfig && Object.keys(dataToUpdate).length === 1;

  if (dataToUpdate.listId && !isDashcardOnlyUpdate) {
    headers["list-id"] = dataToUpdate.listId;
  }

  // Map frontend data to backend format
  const backendData = mapFrontendCardToBackend(dataToUpdate);

  const { data } = await api.put(`/card/${cardId}`, backendData, {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });

  // Map backend response to frontend format
  if (data.data) {
    data.data = mapBackendCardToFrontend(data.data);
  }

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

export const cardComplete = async (
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/complete`);
  return data;
};

export const cardIncomplete = async (
  cardId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/${cardId}/incomplete`);
  return data;
};

export const mirrorCard = async (
  cardId: string,
  payload: { id: string; targetListId: string; targetPositon: number }
): Promise<ApiResponse<Card>> => {
  const { data } = await api.post(`/card/${cardId}/make-mirror`, payload);

  // Map backend response to frontend format
  if (data.data) {
    data.data = mapBackendCardToFrontend(data.data);
  }

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

// Fetch archived cards within a board (requires board-id header)
export const archivedCards = async (
  boardId: string,
  page = 1,
  limit = 100
): Promise<ApiResponse<Card[]>> => {
  const { data } = await api.get(`/card/archived`, {
    headers: { "board-id": boardId },
    params: { page, limit },
  });

  // Map backend response to frontend format
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map(mapBackendCardToFrontend);
  }

  return data;
};

export const moveOldCards = async (): Promise<ApiResponse<any>> => {
  const { data } = await api.post(`/card/move-old-cards`);
  return data;
};

export const deleteAllCardsInList = async (
  listId: string
): Promise<ApiResponse<{ deleted_count: number }>> => {
  const { data } = await api.delete(`/list/${listId}/cards`);
  return data;
};

export const validateCardInFinishingPacking = async (
  cardId: string
): Promise<ApiResponse<{ isValid: boolean; message: string }>> => {
  const { data } = await api.get(`/card/${cardId}/validate-finishing-packing`);
  return data;
};

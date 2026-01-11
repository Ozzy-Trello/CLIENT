import { api } from ".";
import {
  Card,
  CardAttachment,
  CardCustomField,
  CopycardPost,
  ListDashcardDataResponse,
} from "../types/card";
import { ApiResponse } from "../types/type";
import { FileUpload } from "@myTypes/file-upload";

const mapLabelToFrontend = (label: any) => ({
  id: label.id ?? label.label_id,
  name: label.name,
  value: label.value,
  valueType: label.value_type ?? label.valueType,
  workspaceId: label.workspace_id ?? label.workspaceId,
});

const mapCustomFieldToFrontend = (field: any): CardCustomField => ({
  id: field.id ?? field.custom_field_id,
  cardId: field.card_id,
  name: field.name,
  description: field.description,
  source: field.source,
  type: field.type,
  options: field.options,
  isShowAtFront: field.is_show_at_front ?? field.isShowAtFront,
  valueString: field.value_string,
  valueNumber: field.value_number,
  valueOption: field.value_option,
  valueCheckbox: field.value_checkbox,
  valueDate: field.value_date,
  valueUserId: field.value_user_id,
  canView: field.canView,
  canEdit: field.canEdit,
  isPublic: field.isPublic,
});

const mapMemberToFrontend = (member: any) => ({
  id: member.id ?? member.user_id,
  username: member.username,
  email: member.email,
  name: member.name ?? member.username,
});

const mapBackendFileToFrontend = (file: any): FileUpload => ({
  ...file,
  sizeUnit: file.sizeUnit ?? file.size_unit,
  mimeType: file.mimeType ?? file.mime_type,
  createdBy: file.createdBy ?? file.created_by,
  createdAt: file.createdAt ?? file.created_at,
  updatedAt: file.updatedAt ?? file.updated_at,
});

export const mapBackendAttachmentToFrontend = (attachment: any): CardAttachment => ({
  id: attachment.id ?? attachment.attachment_id,
  cardId: attachment.cardId ?? attachment.card_id,
  attachableType: attachment.attachableType ?? attachment.attachable_type,
  attachableId: attachment.attachableId ?? attachment.attachable_id,
  isCover: attachment.isCover ?? attachment.is_cover ?? false,
  isPrinted: attachment.isPrinted ?? attachment.is_printed ?? false,
  type: attachment.type,
  createdBy: attachment.createdBy ?? attachment.created_by,
  createdAt: attachment.createdAt ?? attachment.created_at,
  file: attachment.file ? mapBackendFileToFrontend(attachment.file) : undefined,
  targetCard: attachment.target_card
    ? mapBackendCardToFrontend({ ...attachment.target_card, attachments: undefined })
    : undefined,
  name: attachment.name,
} as CardAttachment);

// Helper function to map backend response to frontend Card format
export const mapBackendCardToFrontend = (backendCard: any): Card => {
  const mapped: any = { ...backendCard };
  const prefetched: Record<string, boolean> = mapped._prefetched
    ? { ...mapped._prefetched }
    : {};

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
  const backendDashCount =
    (backendCard as any).dashcardCount ?? (backendCard as any).dashcard_count;
  if (backendDashCount !== undefined) {
    (mapped as any).dashcardCount = backendDashCount;
    prefetched.dashcardCount = true;
  }
  if (backendCard.attachments_count !== undefined) {
    mapped.attachmentsCount = backendCard.attachments_count;
  }
  if (backendCard.activities_count !== undefined) {
    mapped.activitiesCount = backendCard.activities_count;
  }
  if (backendCard.comments_count !== undefined) {
    mapped.commentsCount = backendCard.comments_count;
  }

  if (backendCard.list_info) {
    mapped.listId = mapped.listId ?? backendCard.list_info.id;
    mapped.listName = mapped.listName ?? backendCard.list_info.name;
    mapped.boardId = mapped.boardId ?? backendCard.list_info.board_id;
  }

  if (backendCard.board_info) {
    mapped.boardId = mapped.boardId ?? backendCard.board_info.id;
    mapped.boardName = mapped.boardName ?? backendCard.board_info.name;
    mapped.workspaceId = mapped.workspaceId ?? backendCard.board_info.workspace_id;
  }

  if (backendCard.workspace_info) {
    mapped.workspaceId = mapped.workspaceId ?? backendCard.workspace_info.id;
    mapped.workspaceName = mapped.workspaceName ?? backendCard.workspace_info.name;
  }

  if (backendCard.attachments) {
    mapped.attachments = (backendCard.attachments as any[]).map(
      mapBackendAttachmentToFrontend
    );
    // Derive cover from attachments if not explicitly set
    if (!mapped.cover) {
      const coverAttachment = (backendCard.attachments as any[]).find(
        (a) => a.is_cover || a.isCover
      );
      if (coverAttachment?.file?.url) {
        mapped.cover = coverAttachment.file.url;
      }
    }
  }

  if (backendCard.time_in_list) {
    mapped.timeInLists = backendCard.time_in_list;
  }

  if (backendCard.time_in_board) {
    mapped.formattedTimeInBoard =
      backendCard.time_in_board?.formatted_time_in_board ??
      mapped.formattedTimeInBoard;
  }

  if (backendCard.requests) {
    mapped.requests = backendCard.requests;
  }

  if (backendCard.labels !== undefined) {
    mapped.labels = (backendCard.labels as any[]).map(mapLabelToFrontend);
    prefetched.labels = true;
  }

  if (backendCard.jumlah_dikirim !== undefined) {
    mapped.jumlahDikirim = backendCard.jumlah_dikirim;
  } else if (backendCard.jumlahDikirim !== undefined) {
    mapped.jumlahDikirim = backendCard.jumlahDikirim;
  }
  if (backendCard.jumlah_produksi !== undefined) {
    mapped.jumlahProduksi = backendCard.jumlah_produksi;
  } else if (backendCard.jumlahProduksi !== undefined) {
    mapped.jumlahProduksi = backendCard.jumlahProduksi;
  } else if (mapped.jumlahDikirim !== undefined) {
    mapped.jumlahProduksi = mapped.jumlahDikirim;
  }

  if (backendCard.custom_fields || backendCard.customFields) {
    const fields = backendCard.custom_fields ?? backendCard.customFields;
    mapped.customFields = (fields as any[]).map(mapCustomFieldToFrontend);
    prefetched.customFields = true;
  }

  if (backendCard.members !== undefined) {
    mapped.members = (backendCard.members as any[]).map(mapMemberToFrontend);
    prefetched.members = true;
  }

  if (Object.keys(prefetched).length > 0) {
    mapped._prefetched = prefetched;
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
  if (data.paginate) {
    // normalize snake_case to camelCase for pagination fields
    (data as any).paginate.totalData =
      data.paginate.totalData ?? data.paginate.total_data;
    (data as any).paginate.nextPage =
      (data.paginate as any).nextPage ?? (data.paginate as any).next_page;
    (data as any).paginate.prevPage =
      (data.paginate as any).prevPage ?? (data.paginate as any).prev_page;
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

// Archive all cards in a specific list
export const archiveAllCardsInList = async (
  listId: string
): Promise<ApiResponse<{ archived_count: number }>> => {
  const { data } = await api.post(`/list/${listId}/cards/archive`);
  return data;
};

export const validateCardInFinishingPacking = async (
  cardId: string
): Promise<ApiResponse<{ isValid: boolean; message: string }>> => {
  const { data } = await api.get(`/card/${cardId}/validate-finishing-packing`);
  return data;
};

export interface FinishingPackingCard {
  id: string;
  name?: string;
  shortId?: number;
  listId?: string;
}

export const getFinishingPackingCards = async (
  search?: string,
  limit = 20
): Promise<FinishingPackingCard[]> => {
  const { data } = await api.get("/card/finishing-packing", {
    params: { search, limit },
  });
  const cards: any[] = data.data || [];
  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    shortId: card.short_id,
    listId: card.list_id,
  }));
};

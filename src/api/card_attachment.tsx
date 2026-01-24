import { api } from "./index";
import {
  TAttachableType,
  CardAttachment,
  TCardAttachmentType,
} from "../types/card";
import { mapBackendCardToFrontend } from "./card";
import { ApiResponse } from "../types/type";

const transformFile = (f: any) => {
  if (!f) return undefined;
  const sizeUnit = f.sizeUnit || f.size_unit;
  const mimeType = f.mimeType || f.mime_type;
  const createdBy = f.createdBy || f.created_by;
  const createdAt = f.createdAt || f.created_at;
  const updatedAt = f.updatedAt || f.updated_at;
  return {
    id: f.id,
    name: f.name,
    url: f.url,
    size: f.size,
    sizeUnit,
    mimeType,
    createdBy,
    createdAt,
    updatedAt,
  };
};

const transformAttachment = (a: any): CardAttachment => {
  if (!a) return a;
  const attachableType = a.attachableType || a.attachable_type;
  const attachableId = a.attachableId || a.attachable_id;
  const cardId = a.cardId || a.card_id;
  const isCover = a.isCover ?? a.is_cover;
  const isPrinted = a.isPrinted ?? a.is_printed;
  const createdBy = a.createdBy || a.created_by;
  const createdAt = a.createdAt || a.created_at;
  return {
    id: a.id,
    cardId,
    attachableType,
    attachableId,
    isCover,
    isPrinted,
    type: a.type,
    createdBy,
    createdAt,
    file: transformFile(a.file),
    targetCard: a.targetCard
      ? mapBackendCardToFrontend(a.targetCard)
      : a.target_card
      ? mapBackendCardToFrontend(a.target_card)
      : undefined,
  };
};

/**
 * Get all attachments for a specific card
 * @param cardId ID of the card to get attachments for
 * @returns Promise with the attachments data
 */
export const getCardAttachments = async (cardId: string): Promise<ApiResponse<CardAttachment[]>> => {
  const { data } = await api.get(`/card-attachment?card_id=${cardId}&page=1&limit=100`);
  if (Array.isArray(data.data)) {
    data.data = data.data.map(transformAttachment);
  }
  return data;
};

/**
 * Create a new attachment linking a file to a card
 * @param params Object containing card_id, file_id, and type
 * @returns Promise with the created attachment data
 */
export const createCardAttachment = async (params: { cardId: string; attachableType: TAttachableType, attachableId: string; isCover: boolean; type?: TCardAttachmentType }): Promise<ApiResponse<CardAttachment>> => {
  const { data } = await api.post('/card-attachment', params);
  if (data.data) data.data = transformAttachment(data.data);
  return data;
};

/**
 * Delete a card attachment
 * @param attachmentId ID of the attachment to delete
 * @returns Promise with the response data
 */
export const deleteCardAttachment = async (attachmentId: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/card-attachment/${attachmentId}`);
  return data;
};

export const updateCardAttachment = async (
  attachmentId: string,
  payload: {
    is_printed?: boolean;
    is_cover?: boolean;
    type?: TCardAttachmentType;
    cardId?: string;
  }
): Promise<ApiResponse<CardAttachment>> => {
  const { cardId, ...rest } = payload;
  const body: Record<string, unknown> = {
    ...rest,
  };
  if (cardId) {
    body.card_id = cardId;
  }
  const { data } = await api.put(`/card-attachment/${attachmentId}`, body);
  if (data.data) data.data = transformAttachment(data.data);
  return data;
};

/**
 * Get a specific card attachment by ID
 * @param attachmentId ID of the attachment to retrieve
 * @returns Promise with the attachment data
 */
export const getCardAttachment = async (attachmentId: string): Promise<ApiResponse<CardAttachment>> => {
  const { data } = await api.get(`/card-attachment/${attachmentId}`);
  if (data.data) {
    data.data = transformAttachment(data.data);
  }
  return data;
};

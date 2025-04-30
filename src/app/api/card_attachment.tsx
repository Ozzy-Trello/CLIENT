import { api } from "./index";
import { ApiResponse, CardAttachment } from "../dto/types";

/**
 * Get all attachments for a specific card
 * @param cardId ID of the card to get attachments for
 * @returns Promise with the attachments data
 */
export const getCardAttachments = async (cardId: string): Promise<ApiResponse<CardAttachment[]>> => {
  const { data } = await api.get(`/card-attachment?card_id=${cardId}`);
  return data;
};

/**
 * Create a new attachment linking a file to a card
 * @param params Object containing card_id and file_id
 * @returns Promise with the created attachment data
 */
export const createCardAttachment = async (params: { cardId: string; fileId: string, isCover: boolean }): Promise<ApiResponse<CardAttachment>> => {
  const { data } = await api.post('/card-attachment', params);
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

/**
 * Get a specific card attachment by ID
 * @param attachmentId ID of the attachment to retrieve
 * @returns Promise with the attachment data
 */
export const getCardAttachment = async (attachmentId: string): Promise<ApiResponse<CardAttachment>> => {
  const { data } = await api.get(`/card-attachment/${attachmentId}`);
  return data;
};
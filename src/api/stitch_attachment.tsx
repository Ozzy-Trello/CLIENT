import { api } from ".";
import { ApiResponse } from "../types/type";

export interface StitchAttachmentRow {
  id?: string;
  cardId: string;
  attachmentId: string;
  userId: string | null;
  stitch: number;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeRow = (row: any): StitchAttachmentRow => ({
  id: row.id,
  cardId: row.cardId || row.card_id || "",
  attachmentId: row.attachmentId || row.attachment_id || "",
  userId: row.userId ?? row.user_id ?? null,
  stitch: Number(row.stitch ?? 0),
  amount: Number(row.amount ?? 0),
  createdAt: row.createdAt || row.created_at,
  updatedAt: row.updatedAt || row.updated_at,
});

export const getStitchAttachments = async (
  cardId: string
): Promise<ApiResponse<StitchAttachmentRow[]>> => {
  const { data } = await api.get(`/stitch-attachment?card_id=${cardId}`);

  if (Array.isArray(data?.data)) {
    data.data = data.data.map(normalizeRow);
  }

  return data;
};

export const bulkUpsertStitchAttachments = async (
  rows: StitchAttachmentRow[]
): Promise<ApiResponse<StitchAttachmentRow[]>> => {
  const { data } = await api.post("/stitch-attachment/bulk", { rows });

  if (Array.isArray(data?.data)) {
    data.data = data.data.map(normalizeRow);
  }

  return data;
};

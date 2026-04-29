import { api } from ".";
import { ApiResponse } from "../types/type";

export interface SablonAttachmentRow {
  id?: string;
  cardId: string;
  attachmentId: string;
  userId?: string | null;
  amount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SablonAttachmentResponse {
  status_code: number;
  message: string;
  data: SablonAttachmentRow[];
}

const normalizeRow = (row: any): SablonAttachmentRow => ({
  id: row.id,
  cardId: row.cardId || row.card_id || "",
  attachmentId: row.attachmentId || row.attachment_id || "",
  userId: row.userId ?? row.user_id ?? null,
  amount: Number(row.amount ?? 0),
  createdAt: row.createdAt || row.created_at,
  updatedAt: row.updatedAt || row.updated_at,
});

export const getSablonAttachments = async (
  cardId: string
): Promise<SablonAttachmentResponse> => {
  const { data } = await api.get(`/sablon-attachment?card_id=${cardId}`);

  if (Array.isArray(data?.data)) {
    data.data = data.data.map(normalizeRow);
  }

  return data;
};

export const bulkUpsertSablonAttachments = async (
  rows: SablonAttachmentRow[]
): Promise<ApiResponse<SablonAttachmentRow[]>> => {
  const { data } = await api.post("/sablon-attachment/bulk", { rows });

  if (Array.isArray(data?.data)) {
    data.data = data.data.map(normalizeRow);
  }

  return data;
};

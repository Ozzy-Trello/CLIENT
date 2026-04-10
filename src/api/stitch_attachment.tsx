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

export interface OperatorBordirRow {
  uuid: string;
  cardId: string;
  submittedAt: string;
  namaFile: string;
  stitch: number;
  jumlahBordirPcs: number;
  totalStitch: number;
  desainer: string;
  nama: string;
  namaCustomer: string;
  jenisOrder: string;
  statusPekerjaan: string;
  namaPo: string;
  uploadPoUrl: string;
  harga: string;
  totalHarga: string;
  keterangan: string;
  noInvoice: string;
  bulan: string;
  mesin: string;
}

export interface OperatorBordirResponse {
  status: string;
  message: string;
  data: OperatorBordirRow[];
  summary: {
    totalData: number;
    totalStitch: number;
  };
}

export const getOperatorBordir = async (
  cardId: string
): Promise<OperatorBordirResponse> => {
  const { data } = await api.get(`/pos/operator-bordir/${cardId}`);
  return data;
};

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

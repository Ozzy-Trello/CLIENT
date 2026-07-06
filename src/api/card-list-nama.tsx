import { api } from ".";
import { ApiResponse } from "../types/type";

export interface ListNama {
  id: string;
  cardId: string;
  nama: string;
  ukuran: string;
  jenisLengan: string | null;
  catatan: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListNamaSummary {
  jenisLengan: string | null;
  sizes: {
    ukuran: string;
    count: number;
  }[];
  total: number;
}

export interface ListNamaCreateRequest {
  nama: string;
  ukuran: string;
  jenisLengan?: string | null;
  catatan?: string | null;
  order?: number;
}

export interface ListNamaUpdateRequest {
  nama?: string;
  ukuran?: string;
  jenisLengan?: string | null;
  catatan?: string | null;
  order?: number;
}

export interface ListNamaBulkRequest {
  rows: ListNamaCreateRequest[];
}

export const getListNama = async (
  cardId: string
): Promise<ApiResponse<ListNama[]>> => {
  const { data } = await api.get(`/card/${cardId}/list-nama`);
  return data;
};

export const getListNamaSummary = async (
  cardId: string
): Promise<ApiResponse<ListNamaSummary[]>> => {
  const { data } = await api.get(`/card/${cardId}/list-nama/summary`);
  return data;
};

export const createListNama = async (
  cardId: string,
  payload: ListNamaCreateRequest
): Promise<ApiResponse<ListNama>> => {
  const { data } = await api.post(`/card/${cardId}/list-nama`, payload);
  return data;
};

export const bulkImportListNama = async (
  cardId: string,
  payload: ListNamaBulkRequest
): Promise<ApiResponse<ListNama[]>> => {
  const { data } = await api.post(`/card/${cardId}/list-nama/bulk`, payload);
  return data;
};

export const updateListNama = async (
  cardId: string,
  itemId: string,
  payload: ListNamaUpdateRequest
): Promise<ApiResponse<ListNama>> => {
  const { data } = await api.patch(`/card/${cardId}/list-nama/${itemId}`, payload);
  return data;
};

export const deleteListNama = async (
  cardId: string,
  itemId: string
): Promise<ApiResponse<any>> => {
  const { data } = await api.delete(`/card/${cardId}/list-nama/${itemId}`);
  return data;
};

import { api } from ".";
import {
  CardNote,
  CreateCardNotePayload,
  UpdateCardNotePayload,
} from "@myTypes/card_note";
import { ApiResponse } from "@myTypes/type";

export const getCardNotes = async (cardId: string): Promise<ApiResponse<CardNote[]>> => {
  const { data } = await api.get(`/card/${cardId}/notes`);
  return data;
};

export const createCardNote = async (
  cardId: string,
  payload: CreateCardNotePayload,
): Promise<ApiResponse<CardNote>> => {
  const { data } = await api.post(`/card/${cardId}/notes`, payload);
  return data;
};

export const updateCardNote = async (
  cardId: string,
  noteId: string,
  payload: UpdateCardNotePayload,
): Promise<ApiResponse<CardNote>> => {
  const { data } = await api.patch(`/card/${cardId}/notes/${noteId}`, payload);
  return data;
};

export const setCardNoteDone = async (
  cardId: string,
  noteId: string,
  done: boolean,
): Promise<ApiResponse<CardNote>> => {
  const { data } = await api.patch(`/card/${cardId}/notes/${noteId}/done`, { done });
  return data;
};

export const deleteCardNote = async (
  cardId: string,
  noteId: string,
): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/card/${cardId}/notes/${noteId}`);
  return data;
};

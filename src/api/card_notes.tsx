import { api } from ".";
import {
  CardNote,
  CreateCardNotePayload,
  UpdateCardNotePayload,
} from "@myTypes/card_note";
import { ApiResponse } from "@myTypes/type";

export interface UnfinishedCardNoteCard {
  cardId: string;
  cardName: string;
  boardId: string;
  boardName: string;
  listId?: string;
  listName: string;
  dueDate?: string | null;
  totalNotes: number;
  doneNotes: number;
  undoneNotes: number;
  notes: CardNote[];
}

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

export const getUnfinishedCardNotes = async (
  workspaceId: string,
  page: number = 1,
  limit: number = 50,
  divisionRoleId?: string,
): Promise<ApiResponse<UnfinishedCardNoteCard[]>> => {
  const response = await api.get("/card-notes/unfinished", {
    params: { workspaceId, page, limit, divisionRoleId },
  });

  if (response.status === 204 || !response.data) {
    return {
      data: [],
      paginate: {
        limit,
        page,
        totalData: 0,
        totalPage: 0,
        nextPage: 0,
        prevPage: 0,
      },
    };
  }

  return response.data;
};

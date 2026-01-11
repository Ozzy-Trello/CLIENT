import { create } from "zustand";

export type DashcardCounts = Record<string, number>;

export interface BoardFullPayload {
  board: any;
  lists: any[];
  dashcardCounts: DashcardCounts;
  meta?: any;
  workspaceId: string;
  fetchedAt: number;
}

interface BoardFullState {
  boards: Record<string, BoardFullPayload>;
  setBoardFull: (
    boardId: string,
    workspaceId: string,
    payload: Omit<BoardFullPayload, "workspaceId" | "fetchedAt">
  ) => void;
  getBoardFull: (boardId?: string) => BoardFullPayload | undefined;
  clearBoard: (boardId: string) => void;
  getDashcardCount: (
    boardId: string,
    dashcardId: string
  ) => number | undefined;
}

export const useBoardFullStore = create<BoardFullState>((set, get) => ({
  boards: {},
  setBoardFull: (boardId, workspaceId, payload) =>
    set((state) => ({
      boards: {
        ...state.boards,
        [boardId]: {
          ...payload,
          workspaceId,
          fetchedAt: Date.now(),
        },
      },
    })),
  getBoardFull: (boardId) => (boardId ? get().boards[boardId] : undefined),
  clearBoard: (boardId) =>
    set((state) => {
      const next = { ...state.boards };
      delete next[boardId];
      return { boards: next };
    }),
  getDashcardCount: (boardId, dashcardId) =>
    get().boards[boardId]?.dashcardCounts?.[dashcardId],
}));

import { api } from ".";
import { Board } from "../types/board";
import { ApiResponse } from "../types/type";

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface ExportBoardCsvResult {
  blob: Blob;
  filename?: string;
}

export const boards = async (
  workspaceId: string
): Promise<ApiResponse<Board[]>> => {
  const { data } = await api.get("/board", {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const boardDetails = async (
  boardId: string,
  workspaceId?: string
): Promise<ApiResponse<Board>> => {
  const response = await api.get(`/board/${boardId}`, {
    headers: workspaceId ? { "workspace-id": workspaceId } : {},
  });
  
  return response.data;
};

export const createBoard = async (
  board: Partial<Board> & { roleIds?: string[] },
  workspaceId: string
): Promise<ApiResponse<Board>> => {
  const { data } = await api.post(`/board`, board, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const updateBoard = async (
  boardId: string,
  board: Partial<Board> & { roleIds?: string[] },
  workspaceId: string
): Promise<ApiResponse<Board>> => {
  const { data } = await api.put(`/board/${boardId}`, board, {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export const getBoardRoles = async (
  boardId: string
): Promise<ApiResponse<Role[]>> => {
  const { data } = await api.get(`/board/${boardId}/roles`);
  return data;
};

export const getAllRoles = async (
  workspaceId: string
): Promise<ApiResponse<Role[]>> => {
  const { data } = await api.get("/roles", {
    headers: { "workspace-id": workspaceId },
  });
  return data;
};

export interface BoardCalendarCard {
  id: string;
  listId: string;
  listName: string;
  name: string;
  dueDate: string;
  startDate: string | null;
  isComplete: boolean;
  cover: string | null;
}

export interface BoardCalendarSummary {
  overdue: number;
  dueThisMonth: number;
  dueNextMonth: number;
}

export const getBoardCalendarCards = async (
  boardId: string,
  from: string,
  to: string,
  excludeListIds: string[] = []
): Promise<ApiResponse<BoardCalendarCard[]>> => {
  const { data } = await api.get(`/board/${boardId}/calendar`, {
    params: {
      from,
      to,
      exclude_list_ids: excludeListIds.length ? excludeListIds.join(",") : undefined,
    },
  });
  return data;
};

export const getBoardCalendarIgnoredLists = async (
  boardId: string
): Promise<ApiResponse<string[]>> => {
  const { data } = await api.get(`/board/${boardId}/calendar/ignored-lists`);
  return data;
};

export const updateBoardCalendarIgnoredLists = async (
  boardId: string,
  listIds: string[]
): Promise<ApiResponse<string[]>> => {
  const { data } = await api.put(`/board/${boardId}/calendar/ignored-lists`, {
    list_ids: listIds,
  });
  return data;
};

export const getBoardCalendarSummary = async (
  boardId: string,
  ranges: {
    today: string;
    monthStart: string;
    monthEnd: string;
    nextMonthStart: string;
    nextMonthEnd: string;
  },
  excludeListIds: string[] = []
): Promise<ApiResponse<BoardCalendarSummary>> => {
  const { data } = await api.get(`/board/${boardId}/calendar/summary`, {
    params: {
      today: ranges.today,
      month_start: ranges.monthStart,
      month_end: ranges.monthEnd,
      next_month_start: ranges.nextMonthStart,
      next_month_end: ranges.nextMonthEnd,
      exclude_list_ids: excludeListIds.length ? excludeListIds.join(",") : undefined,
    },
  });
  return data;
};

export const exportBoardCsv = async (
  boardId: string,
  workspaceId?: string
): Promise<ExportBoardCsvResult> => {
  const response = await api.get(`/board/${boardId}/export/csv`, {
    responseType: "blob",
    headers: workspaceId
      ? {
          "workspace-id": workspaceId,
        }
      : undefined,
  });

  return {
    blob: response.data,
    filename: response.headers["content-disposition"],
  };
};

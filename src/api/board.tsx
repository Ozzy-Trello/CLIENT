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
}

export const getBoardCalendarCards = async (
  boardId: string,
  from: string,
  to: string
): Promise<ApiResponse<BoardCalendarCard[]>> => {
  const { data } = await api.get(`/board/${boardId}/calendar`, {
    params: { from, to },
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

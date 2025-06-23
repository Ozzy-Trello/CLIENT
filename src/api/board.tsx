import { api } from ".";
import { Board } from "../types/board";
import { ApiResponse } from "../types/type";

export interface Role {
  id: string;
  name: string;
  description: string;
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
  boardId: string
): Promise<ApiResponse<Board>> => {
  const { data } = await api.get(`/board/${boardId}`);
  return data;
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
  console.log("updating board");
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

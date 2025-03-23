import { api } from ".";
import { ApiResponse, Board } from "../dto/types";

export const boards = async(workspaceId: string): Promise<ApiResponse<Board[]>> => {
  const { data } = await api.get("/board", { headers: { 'workspace-id': workspaceId } });
  return data;
}

export const boardDetails = async(boardId: string): Promise<ApiResponse<Board>> => {
  const { data } = await api.get(`/board/${boardId}`)
  return data;
}

export const createBoard = async(board: Partial<Board>, workspaceId: string): Promise<ApiResponse<Board>> => {
  const { data } = await api.post(`/board`, board, 
    {headers: {"workspace-id": workspaceId}}
  );
  return data;
}
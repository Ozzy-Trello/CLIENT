import { api } from ".";
import { ApiResponse } from "../types/type";

export interface SearchResult {
  [x: string]: any;
  id: string;
  name: string;
  description?: string;
  type: "card" | "board";
  boardId?: string;
  boardName?: string; // Converted from backend board_name
  listId?: string;
  listName?: string; // Converted from backend list_name
  workspaceId?: string; // Converted from backend workspace_id
  workspaceName?: string; // Converted from backend workspace_name
  cover?: string;
  createdAt?: Date; // Converted from backend created_at
  updatedAt?: Date; // Converted from backend updated_at
}

export interface GroupedSearchResults {
  cards: SearchResult[];
  boards: SearchResult[];
}

export const unifiedSearch = async (
  query: string,
  workspaceId?: string,
  params?: any
): Promise<ApiResponse<GroupedSearchResults>> => {
  const headers: any = {};
  if (workspaceId) {
    headers["workspace-id"] = workspaceId;
  }

  const { data } = await api.get("/search", {
    params: { q: query, ...params },
    headers,
  });
  return data;
};

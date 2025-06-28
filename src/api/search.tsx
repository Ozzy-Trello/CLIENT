import { api } from ".";
import { ApiResponse } from "../types/type";

export interface SearchResult {
  id: string;
  name: string;
  description?: string;
  type: "card" | "board";
  board_id?: string;
  board_name?: string;
  list_id?: string;
  list_name?: string;
  workspace_id?: string;
  workspace_name?: string;
  cover?: string;
  created_at?: Date;
  updated_at?: Date;
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

import { api } from ".";
import { CardAccessory } from "./card-accessory";
import { ApiResponse } from "../types/type";

export interface UnfinishedAccessoryCard {
  cardId: string;
  cardName: string;
  boardId: string;
  boardName: string;
  listId?: string;
  listName: string;
  dueDate?: string | null;
  totalAccessories: number;
  doneAccessories: number;
  undoneAccessories: number;
  accessories: CardAccessory[];
}

// Get all cards with unfinished accessories in a workspace
export const getUnfinishedCardAccessories = async (
  workspaceId: string,
  page: number = 1,
  limit: number = 50
): Promise<ApiResponse<UnfinishedAccessoryCard[]>> => {
  const response = await api.get(`/card-accessories/unfinished`, {
    params: { workspaceId, page, limit },
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

import { api } from ".";
import { ApiResponse } from "../types/type";

export interface BoardOrderUpdate {
  board_id: string;
  order_index: number;
}

export interface SetUserBoardOrderData {
  board_orders: BoardOrderUpdate[];
}

export interface UserBoardOrderDetail {
  id: string;
  user_id: string;
  board_id: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user's board order for a specific board
 */
export const getUserBoardOrder = async (
  userId: string,
  boardId: string
): Promise<ApiResponse<UserBoardOrderDetail>> => {
  const { data } = await api.get(
    `/user-board-order/users/${userId}/boards/${boardId}`
  );
  return data;
};

/**
 * Get all boards for a user in their custom order
 */
export const getUserBoardsInOrder = async (
  userId: string
): Promise<ApiResponse<UserBoardOrderDetail[]>> => {
  const { data } = await api.get(`/user-board-order/`, {
    params: { user_id: userId },
  });
  return data;
};

/**
 * Set custom order for user's boards
 */
export const setUserBoardOrder = async (
  userId: string,
  boardOrders: BoardOrderUpdate[]
): Promise<ApiResponse<string>> => {
  const { data } = await api.post(
    `/user-board-order/users/${userId}/set-order`,
    {
      board_orders: boardOrders,
    }
  );
  return data;
};

/**
 * Move a board to a specific position in user's order
 */
export const moveBoardInUserOrder = async (
  userId: string,
  boardId: string,
  newOrderIndex: number
): Promise<ApiResponse<string>> => {
  const { data } = await api.patch(
    `/user-board-order/users/${userId}/boards/${boardId}/move`,
    {
      newOrderIndex,
    }
  );
  return data;
};

/**
 * Add a board to user's custom order
 */
export const addBoardToUserOrder = async (
  userId: string,
  boardId: string
): Promise<ApiResponse<UserBoardOrderDetail>> => {
  const { data } = await api.post(
    `/user-board-order/users/${userId}/boards/${boardId}`
  );
  return data;
};

/**
 * Remove a board from user's custom order
 */
export const removeBoardFromUserOrder = async (
  userId: string,
  boardId: string
): Promise<ApiResponse<string>> => {
  const { data } = await api.delete(
    `/user-board-order/users/${userId}/boards/${boardId}`
  );
  return data;
};

/**
 * Reset user's board order to default
 */
export const resetUserBoardOrder = async (
  userId: string
): Promise<ApiResponse<string>> => {
  const { data } = await api.delete(`/user-board-order/users/${userId}/reset`);
  return data;
};

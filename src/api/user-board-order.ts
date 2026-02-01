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
  userId: string;
  boardId: string;
  orderIndex: number;
  isFavorite?: boolean;
  favoriteOrderIndex?: number | null;
  createdAt?: string;
  updatedAt?: string;
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
    params: { user_id: userId, page: 1, limit: 1000 },
  });
  
  // Transform snake_case to camelCase for consistency
  if (data.data && Array.isArray(data.data)) {
    data.data = data.data.map((order: any) => ({
      id: order.id,
      userId: order.userId ?? order.user_id,
      boardId: order.boardId ?? order.board_id,
      orderIndex: order.orderIndex ?? order.order_index,
      isFavorite: order.isFavorite ?? order.is_favorite,
      favoriteOrderIndex: order.favoriteOrderIndex ?? order.favorite_order_index,
      createdAt: order.createdAt ?? order.created_at,
      updatedAt: order.updatedAt ?? order.updated_at,
    }));
  }
  
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

/**
 * Toggle favorite status for a board
 */
export const toggleBoardFavorite = async (
  userId: string,
  boardId: string
): Promise<ApiResponse<{ isFavorite: boolean }>> => {
  console.log('[FAVORITE TOGGLE LOG] API call - userId:', userId, 'boardId:', boardId);
  
  // Include userId in the request body since the endpoint might need it
  const { data } = await api.post(`/board/${boardId}/favorite`, {
    userId: userId
  });
  
  console.log('[FAVORITE TOGGLE LOG] API response - raw:', data);
  
  // NOTE: Response keys are already converted to camelCase by axios interceptor
  // So data?.data?.isFavorite should already be present if backend returned is_favorite
  console.log('[FAVORITE TOGGLE LOG] API response - transformed:', data);
  return data;
};

/**
 * Set favorite order for user's boards
 */
export const setUserBoardFavoriteOrder = async (
  userId: string,
  boardOrders: BoardOrderUpdate[]
): Promise<ApiResponse<string>> => {
  // Convert BoardOrderUpdate[] to the format expected by backend
  const favoriteOrders = boardOrders.map(order => ({
    boardId: order.board_id,
    favoriteOrderIndex: order.order_index,
  }));
  
  const { data } = await api.put(
    `/board/favorites/order`,
    {
      favoriteOrders: favoriteOrders,
    }
  );
  return data;
};

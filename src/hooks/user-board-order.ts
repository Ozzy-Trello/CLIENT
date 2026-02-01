import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserBoardsInOrder,
  setUserBoardOrder,
  setUserBoardFavoriteOrder,
  moveBoardInUserOrder,
  addBoardToUserOrder,
  removeBoardFromUserOrder,
  resetUserBoardOrder,
  toggleBoardFavorite,
  BoardOrderUpdate,
  UserBoardOrderDetail,
} from "../api/user-board-order";
import { useCurrentAccount } from "./account";
import { Board } from "../types/board";
import { ApiResponse } from "../types/type";

/**
 * Hook to manage user board ordering with drag-and-drop support
 */
export function useUserBoardOrder(workspaceId: string) {
  const queryClient = useQueryClient();
  const { data: account } = useCurrentAccount();
  const userId = account?.data?.id;

  // Query to get user's board order
  const userBoardOrderQuery = useQuery({
    queryKey: ["userBoardOrder", userId],
    queryFn: () => getUserBoardsInOrder(userId!),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });

  // Mutation to set complete board order (for bulk updates)
  const setOrderMutation = useMutation({
    mutationFn: (boardOrders: BoardOrderUpdate[]) => {
      if (!userId) throw new Error("User not authenticated");
      return setUserBoardOrder(userId, boardOrders);
    },
    onMutate: async (newBoardOrders) => {
      if (!userId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["userBoardOrder", userId] });

      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData([
        "userBoardOrder",
        userId,
      ]);

      // Optimistically update the order
      queryClient.setQueryData(
        ["userBoardOrder", userId],
        (old: ApiResponse<UserBoardOrderDetail[]> | undefined) => {
          if (!old?.data) return old;

          // Create a map of existing orders for preservation
          const existingOrdersMap = new Map(
            old.data.map(order => [order.boardId, order])
          );

          // Update only the boards that are being reordered
          const updatedOrdersMap = new Map(existingOrdersMap);
          
          newBoardOrders.forEach((order) => {
             const existingOrder = existingOrdersMap.get(order.board_id);
             if (existingOrder) {
               updatedOrdersMap.set(order.board_id, {
                 ...existingOrder,
                 orderIndex: order.order_index,
               });
             } else {
               // Handle new board orders if they don't exist
               updatedOrdersMap.set(order.board_id, {
                 id: `temp-${order.board_id}`,
                 userId: userId,
                 boardId: order.board_id,
                 orderIndex: order.order_index,
               } as UserBoardOrderDetail);
             }
           });

          // Convert back to array and sort by order index
          const newData = Array.from(updatedOrdersMap.values())
            .sort((a, b) => {
               // For favorites, sort by favoriteOrderIndex if available, otherwise by orderIndex
               const aIndex = a.favoriteOrderIndex ?? a.orderIndex;
               const bIndex = b.favoriteOrderIndex ?? b.orderIndex;
               return aIndex - bIndex;
             });

          return {
            ...old,
            data: newData,
          };
        }
      );

      return { previousOrder };
    },
    onError: (err, boardId, context) => {
      // Rollback on error
      if (context?.previousOrder && userId) {
        queryClient.setQueryData(
          ["userBoardOrder", userId],
          context.previousOrder
        );
      }
    },
    onSettled: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  // Mutation to set favorite board order
  const setFavoriteOrderMutation = useMutation({
    mutationFn: (boardOrders: BoardOrderUpdate[]) => {
      if (!userId) throw new Error("User not authenticated");
      return setUserBoardFavoriteOrder(userId, boardOrders);
    },
    onMutate: async (newBoardOrders) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["userBoardOrder", userId] });
      const previousOrder = queryClient.getQueryData([
        "userBoardOrder",
        userId,
      ]);

      queryClient.setQueryData(
        ["userBoardOrder", userId],
        (old: ApiResponse<UserBoardOrderDetail[]> | undefined) => {
          if (!old?.data) return old;

          const existingOrdersMap = new Map(
            old.data.map(order => [order.boardId, order])
          );

          const updatedOrdersMap = new Map(existingOrdersMap);
          
          newBoardOrders.forEach((order) => {
             const existingOrder = existingOrdersMap.get(order.board_id);
             if (existingOrder) {
               updatedOrdersMap.set(order.board_id, {
                 ...existingOrder,
                 favoriteOrderIndex: order.order_index,
               });
             } else {
               // Handle new favorite board orders if they don't exist
               updatedOrdersMap.set(order.board_id, {
                 id: `temp-${order.board_id}`,
                 userId: userId,
                 boardId: order.board_id,
                 orderIndex: 0, // Default order index
                 isFavorite: true,
                 favoriteOrderIndex: order.order_index,
               } as UserBoardOrderDetail);
             }
           });

          const newData = Array.from(updatedOrdersMap.values())
            .sort((a, b) => a.orderIndex - b.orderIndex);

          return {
            ...old,
            data: newData,
          };
        }
      );

      return { previousOrder };
    },
    onError: (err, boardId, context) => {
      if (context?.previousOrder && userId) {
        queryClient.setQueryData(
          ["userBoardOrder", userId],
          context.previousOrder
        );
      }
    },
    onSettled: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  // Mutation to move a single board
  const moveBoardMutation = useMutation({
    mutationFn: ({
      boardId,
      newOrderIndex,
    }: {
      boardId: string;
      newOrderIndex: number;
    }) => {
      if (!userId) throw new Error("User not authenticated");
      return moveBoardInUserOrder(userId, boardId, newOrderIndex);
    },
    onMutate: async ({ boardId, newOrderIndex }) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["userBoardOrder", userId] });

      const previousOrder = queryClient.getQueryData([
        "userBoardOrder",
        userId,
      ]);

      // Optimistically update the order
      queryClient.setQueryData(
        ["userBoardOrder", userId],
        (old: ApiResponse<UserBoardOrderDetail[]> | undefined) => {
          if (!old?.data) return old;

          const data = [...old.data];
          const fromIndex = data.findIndex((item) => item.boardId === boardId);

          if (fromIndex === -1) return old;

          // Remove the item from its current position
          const [movedItem] = data.splice(fromIndex, 1);

          // Insert it at the new position
          const toIndex = Math.min(newOrderIndex, data.length);
          data.splice(toIndex, 0, movedItem);

          // Update order indices
          const reorderedData = data.map((item, index) => ({
            ...item,
            order_index: index,
          }));

          return {
            ...old,
            data: reorderedData,
          };
        }
      );

      return { previousOrder };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrder && userId) {
        queryClient.setQueryData(
          ["userBoardOrder", userId],
          context.previousOrder
        );
      }
    },
    onSettled: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  // Mutation to add a board to user's order
  const addBoardMutation = useMutation({
    mutationFn: (boardId: string) => {
      if (!userId) throw new Error("User not authenticated");
      return addBoardToUserOrder(userId, boardId);
    },
    onSuccess: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  // Mutation to remove a board from user's order
  const removeBoardMutation = useMutation({
    mutationFn: (boardId: string) => {
      if (!userId) throw new Error("User not authenticated");
      return removeBoardFromUserOrder(userId, boardId);
    },
    onSuccess: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  // Mutation to reset user's board order
  const resetOrderMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("User not authenticated");
      return resetUserBoardOrder(userId);
    },
    onSuccess: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  // Mutation to toggle board favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: (boardId: string) => {
      if (!userId) throw new Error("User not authenticated");
      return toggleBoardFavorite(userId, boardId);
    },
    onMutate: async (boardId: string) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["userBoardOrder", userId] });
      const previousOrder = queryClient.getQueryData([
        "userBoardOrder",
        userId,
      ]);

      // Optimistically flip isFavorite in cache
      queryClient.setQueryData(
        ["userBoardOrder", userId],
        (old: ApiResponse<UserBoardOrderDetail[]> | undefined) => {
          if (!old?.data) return old;
          const data = [...old.data];
          const idx = data.findIndex((i) => i.boardId === boardId);
          if (idx === -1) return old;

          const wasFavorite = !!data[idx].isFavorite;
          if (wasFavorite) {
            data[idx] = {
              ...data[idx],
              isFavorite: false,
              favoriteOrderIndex: null,
            };
          } else {
            const maxFav = data.reduce(
              (m, o) =>
                o.isFavorite && o.favoriteOrderIndex != null
                  ? Math.max(m, Number(o.favoriteOrderIndex))
                  : m,
              0
            );
            data[idx] = {
              ...data[idx],
              isFavorite: true,
              favoriteOrderIndex: (maxFav || 0) + 1,
            };
          }

          return { ...old, data };
        }
      );

      return { previousOrder };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousOrder && userId) {
        queryClient.setQueryData(
          ["userBoardOrder", userId],
          context.previousOrder
        );
      }
    },
    onSettled: () => {
      // Only invalidate boards query - it includes all ordering and favorite info
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  const isSettingOrder =
    setOrderMutation.isPending ||
    setFavoriteOrderMutation.isPending ||
    moveBoardMutation.isPending ||
    addBoardMutation.isPending ||
    removeBoardMutation.isPending ||
    resetOrderMutation.isPending;

  const isTogglingFavorite = toggleFavoriteMutation.isPending;

  /**
   * Helper function to get boards sorted by user's custom order
   */
  const getSortedBoards = (boards: Board[]): Board[] => {
    // Separate favorites and regular boards
    const favorites = boards.filter(board => board.isFavorite);
    const regulars = boards.filter(board => !board.isFavorite);

    // Sort favorites by favoriteOrderIndex
    favorites.sort((a, b) => {
      const indexA = a.favoriteOrderIndex ?? 0;
      const indexB = b.favoriteOrderIndex ?? 0;
      return indexA - indexB;
    });

    // Sort regular boards by orderIndex
    regulars.sort((a, b) => {
      const indexA = a.orderIndex ?? 0;
      const indexB = b.orderIndex ?? 0;
      return indexA - indexB;
    });

    // Return favorites first, then regular boards
    return [...favorites, ...regulars];
  };

  // Helper to reorder boards and persist to API (e.g., during drag and drop)
  const handleBoardReorder = (
    boards: Board[],
    sourceIndex: number,
    destinationIndex: number,
    isFavoriteList: boolean = false
  ) => {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }

    // Reorder boards locally first
    const updatedBoards = Array.from(boards);
    const [movedBoard] = updatedBoards.splice(sourceIndex, 1);
    updatedBoards.splice(destinationIndex, 0, movedBoard);

    const updatedBoardIds = new Set(updatedBoards.map((board) => board.id));

    // Optimistically update the boards cache so UI stays in sync during drag transitions
    queryClient.setQueryData(
      ["boards", workspaceId],
      (old: ApiResponse<Board[]> | undefined) => {
        if (!old?.data) {
          return old;
        }

        const nextData = old.data.map((board) => {
          if (!updatedBoardIds.has(board.id)) {
            return board;
          }

          const newIndex = updatedBoards.findIndex((item) => item.id === board.id);
          if (newIndex === -1) {
            return board;
          }

          if (isFavoriteList) {
            return {
              ...board,
              favoriteOrderIndex: newIndex,
              isFavorite: true,
            };
          }

          return {
            ...board,
            orderIndex: newIndex,
          };
        });

        return {
          ...old,
          data: nextData,
        };
      }
    );

    if (isFavoriteList) {
      // For favorites, only send the reordered favorite boards
      const favoriteBoardOrders: BoardOrderUpdate[] = updatedBoards.map((board, index) => ({
        board_id: board.id,
        order_index: index, // Sequential 0-based indexing for favorites
      }));

      setFavoriteOrderMutation.mutate(favoriteBoardOrders, {
        onError: (error) => {
          console.error('Failed to update favorite board order:', error);
        },
        onSuccess: () => {
          // Successfully updated favorite board order
        }
      });
    } else
 {
      // For regular boards, only send the reordered regular boards
      const allBoardOrders: BoardOrderUpdate[] = updatedBoards.map((board, index) => ({
        board_id: board.id,
        order_index: index, // Sequential 0-based indexing among regular boards
      }));

      setOrderMutation.mutate(allBoardOrders, {
        onError: (error) => {
          console.error('Failed to update board order:', error);
        },
        onSuccess: () => {
          // Successfully updated board order
        }
      });
    }

    return updatedBoards;
  };

  return {
    userBoardOrder: userBoardOrderQuery.data?.data || [],
    isLoading: userBoardOrderQuery.isLoading,
    isError: userBoardOrderQuery.isError,
    setOrder: setOrderMutation.mutate,
    moveBoard: moveBoardMutation.mutate,
    addBoard: addBoardMutation.mutate,
    removeBoard: removeBoardMutation.mutate,
    resetOrder: resetOrderMutation.mutate,
    toggleFavorite: toggleFavoriteMutation.mutate,
    refetchUserBoardOrder: userBoardOrderQuery.refetch,
    getSortedBoards,
    handleBoardReorder,
    isSettingOrder,
    isTogglingFavorite,
  };
}

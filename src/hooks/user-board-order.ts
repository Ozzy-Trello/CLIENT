import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserBoardsInOrder,
  setUserBoardOrder,
  moveBoardInUserOrder,
  addBoardToUserOrder,
  removeBoardFromUserOrder,
  resetUserBoardOrder,
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

          // Create new order based on the provided board orders
          const newData = newBoardOrders
            .sort((a, b) => a.order_index - b.order_index)
            .map((order, index) => {
              const existingOrder = old.data?.find(
                (item) => item.board_id === order.board_id
              );
              return {
                ...existingOrder,
                board_id: order.board_id,
                order_index: index,
                user_id: userId,
                id: existingOrder?.id || `temp-${order.board_id}`,
              } as UserBoardOrderDetail;
            });

          return {
            ...old,
            data: newData,
          };
        }
      );

      return { previousOrder };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousOrder && userId) {
        queryClient.setQueryData(
          ["userBoardOrder", userId],
          context.previousOrder
        );
      }
    },
    onSettled: () => {
      // Always refetch after mutation
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["userBoardOrder", userId] });
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
          const fromIndex = data.findIndex((item) => item.board_id === boardId);

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
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["userBoardOrder", userId] });
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
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["userBoardOrder", userId] });
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
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["userBoardOrder", userId] });
      }
    },
  });

  // Mutation to reset board order
  const resetOrderMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("User not authenticated");
      return resetUserBoardOrder(userId);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["userBoardOrder", userId] });
        queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      }
    },
  });

  /**
   * Helper function to get boards sorted by user's custom order
   */
  const getSortedBoards = (boards: Board[]): Board[] => {
    const userOrder = userBoardOrderQuery.data?.data;

    if (!userOrder || userOrder.length === 0) {
      // Return boards in their default order if no custom order exists
      return boards;
    }

    // Create a map for quick lookup
    const orderMap = new Map(
      userOrder.map((order) => [order.board_id, order.order_index])
    );

    // Sort boards based on user's custom order
    return boards.sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  };

  /**
   * Helper function to handle drag and drop reordering
   */
  const handleBoardReorder = (
    boards: Board[],
    sourceIndex: number,
    destinationIndex: number
  ) => {
    if (!userId || sourceIndex === destinationIndex) return;

    const reorderedBoards = Array.from(boards);
    const [removed] = reorderedBoards.splice(sourceIndex, 1);
    reorderedBoards.splice(destinationIndex, 0, removed);

    // Create board orders array
    const boardOrders: BoardOrderUpdate[] = reorderedBoards.map(
      (board, index) => ({
        board_id: board.id,
        order_index: index,
      })
    );

    // Execute the mutation
    setOrderMutation.mutate(boardOrders);
  };

  return {
    // Data
    userBoardOrder: userBoardOrderQuery.data?.data || [],
    isLoading: userBoardOrderQuery.isLoading,
    isError: userBoardOrderQuery.isError,
    error: userBoardOrderQuery.error,

    // Mutations
    setOrder: setOrderMutation.mutate,
    moveBoard: moveBoardMutation.mutate,
    addBoard: addBoardMutation.mutate,
    removeBoard: removeBoardMutation.mutate,
    resetOrder: resetOrderMutation.mutate,

    // Loading states
    isSettingOrder: setOrderMutation.isPending,
    isMovingBoard: moveBoardMutation.isPending,
    isAddingBoard: addBoardMutation.isPending,
    isRemovingBoard: removeBoardMutation.isPending,
    isResettingOrder: resetOrderMutation.isPending,

    // Helper functions
    getSortedBoards,
    handleBoardReorder,
  };
}

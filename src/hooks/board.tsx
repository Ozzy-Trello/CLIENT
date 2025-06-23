import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  boardDetails,
  boards,
  updateBoard,
  getBoardRoles,
  getAllRoles,
  Role,
} from "../api/board";
import { api } from "../api";
import { ApiResponse } from "../types/type";
import { Board } from "../types/board";
import { useWorkspaces } from "./workspace";

/**
 * Hook to fetch all boards for a workspace
 */
export function useBoards(workspaceId: string) {
  const queryClient = useQueryClient();

  // Main query for boards
  const boardsQuery = useQuery({
    queryKey: ["boards", workspaceId],
    queryFn: () => boards(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5000,
  });

  // Create board mutation with optimistic updates
  const createBoardMutation = useMutation({
    mutationFn: (data: { board: Partial<Board> }) => {
      return api.post<ApiResponse<Board>>(`/board`, data.board);
    },
    // Optimistic update
    onMutate: async (newBoardData) => {
      const newBoard = newBoardData.board;
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["boards", workspaceId] });

      // Snapshot previous value
      const previousBoards = queryClient.getQueryData(["boards", workspaceId]);

      // Create temporary board for optimistic update
      const tempBoard = {
        ...newBoard,
        id: newBoard.id || `temp-board-${Date.now()}`,
        createdAt: new Date().toISOString(),
        workspaceId: workspaceId,
      };

      // Update the UI optimistically
      queryClient.setQueryData(
        ["boards", workspaceId],
        (old: ApiResponse<Board[]> | undefined) => {
          if (!old) return { data: [tempBoard] };
          return {
            ...old,
            data: [...(old.data ?? []), tempBoard],
          };
        }
      );

      return { previousBoards };
    },
    // If mutation fails, roll back
    onError: (err, newBoard, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(
          ["boards", workspaceId],
          context.previousBoards
        );
      }
    },
    // Always reconcile after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId] });
    },
  });

  // Update board mutation
  const updateBoardMutation = useMutation({
    mutationFn: ({
      boardId,
      updates,
    }: {
      boardId: string;
      updates: Partial<Board>;
    }) => {
      return api.patch(`/board/${boardId}`, updates);
    },
    // Optimistic update
    onMutate: async ({ boardId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["boards", workspaceId] });
      await queryClient.cancelQueries({ queryKey: ["boardDetails", boardId] });

      // Snapshot previous values
      const previousBoards = queryClient.getQueryData(["boards", workspaceId]);
      const previousBoardDetails = queryClient.getQueryData([
        "boardDetails",
        boardId,
      ]);

      // Update boards list optimistically
      queryClient.setQueryData(
        ["boards", workspaceId],
        (old: ApiResponse<Board[]> | undefined) => {
          if (!old) return { data: [] };

          return {
            ...old,
            data: (old.data ?? []).map((board) =>
              board.id === boardId ? { ...board, ...updates } : board
            ),
          };
        }
      );

      // Update board details if they're cached
      if (previousBoardDetails) {
        queryClient.setQueryData(
          ["boardDetails", boardId],
          (old: ApiResponse<Board> | undefined) => {
            if (!old) return undefined;

            return {
              ...old,
              data: { ...(old.data ?? {}), ...updates },
            };
          }
        );
      }

      return { previousBoards, previousBoardDetails, boardId };
    },
    // Roll back on error
    onError: (err, variables, context) => {
      if (context) {
        if (context.previousBoards) {
          queryClient.setQueryData(
            ["boards", workspaceId],
            context.previousBoards
          );
        }
        if (context.previousBoardDetails) {
          queryClient.setQueryData(
            ["boardDetails", context.boardId],
            context.previousBoardDetails
          );
        }
      }
    },
    // Always reconcile
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ["boardDetails", variables.boardId],
      });
    },
  });

  return {
    boards: boardsQuery.data?.data || [],
    pagination: boardsQuery.data?.paginate,
    isLoading: boardsQuery.isLoading,
    isError: boardsQuery.isError,
    error: boardsQuery.error,
    createBoard: createBoardMutation.mutate,
    updateBoard: updateBoardMutation.mutate,
    isCreatingBoard: createBoardMutation.isPending,
    isUpdatingBoard: updateBoardMutation.isPending,
  };
}

/**
 * Hook to fetch detailed information about a specific board
 */
export function useBoardRoles(boardId: string) {
  return useQuery({
    queryKey: ["board-roles", boardId],
    queryFn: () => getBoardRoles(boardId),
    enabled: !!boardId,
  });
}

export function useAllRoles(workspaceId: string) {
  return useQuery({
    queryKey: ["roles", workspaceId],
    queryFn: () => getAllRoles(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useUpdateBoard(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      boardId: string;
      board: Partial<Board> & { roleIds?: string[] };
    }) => updateBoard(data.boardId, data.board, workspaceId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["board", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      queryClient.invalidateQueries({
        queryKey: ["board-roles", variables.boardId],
      });
    },
  });
}

export function useBoardDetails(
  boardId: string,
  options: { enabled?: boolean } = {}
) {
  const queryClient = useQueryClient();

  // Main query for board details with refetchOnMount and refetchOnWindowFocus
  const boardDetailsQuery = useQuery({
    queryKey: ["boardDetails", boardId],
    queryFn: () => boardDetails(boardId),
    enabled: options.enabled !== false && !!boardId, // Only enable if boardId exists and not explicitly disabled
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce unnecessary requests
    staleTime: 0, // Data is considered stale immediately
  });

  // Function to manually refetch the board details
  const refetch = async () => {
    if (boardId) {
      await queryClient.invalidateQueries({
        queryKey: ["boardDetails", boardId],
        refetchType: "active", // Only refetch active queries
      });
      return boardDetailsQuery.refetch();
    }
  };

  // Update board details mutation with optimistic updates
  const updateBoardDetailsMutation = useMutation({
    mutationFn: (updates: Partial<Board>) => {
      if (!boardId) throw new Error("No board ID provided");
      return api.patch(`/board/${boardId}`, updates);
    },
    onMutate: async (updates) => {
      if (!boardId) return;

      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["boardDetails", boardId] });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData([
        "boardDetails",
        boardId,
      ]);

      // Update optimistically
      queryClient.setQueryData(
        ["boardDetails", boardId],
        (old: ApiResponse<Board> | undefined) => {
          if (!old) return undefined;
          return {
            ...old,
            data: { ...(old.data ?? {}), ...updates },
          };
        }
      );

      return { previousDetails };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDetails) {
        queryClient.setQueryData(
          ["boardDetails", boardId],
          context.previousDetails
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ["boardDetails", boardId],
        refetchType: "active", // Only refetch active queries
      });
    },
  });

  return {
    board: boardDetailsQuery.data?.data,
    isLoading: boardDetailsQuery.isLoading,
    isError: boardDetailsQuery.isError,
    error: boardDetailsQuery.error,
    refetch,
    updateBoard: updateBoardDetailsMutation.mutate,
    isUpdating: updateBoardDetailsMutation.isPending,
  };
}

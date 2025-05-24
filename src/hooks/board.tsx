import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { boardDetails, boards } from "../api/board";
import { api } from "../api";
import { ApiResponse } from "../types/type";
import { Board } from "../types/board";

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
            data: [...(old.data ?? []), tempBoard]
          };
        }
      );
      
      return { previousBoards };
    },
    // If mutation fails, roll back
    onError: (err, newBoard, context) => {
      if (context?.previousBoards) {
        queryClient.setQueryData(["boards", workspaceId], context.previousBoards);
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
    mutationFn: ({ boardId, updates }: { boardId: string; updates: Partial<Board> }) => {
      return api.patch(`/board/${boardId}`, updates);
    },
    // Optimistic update
    onMutate: async ({ boardId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["boards", workspaceId] });
      await queryClient.cancelQueries({ queryKey: ["boardDetails", boardId] });
      
      // Snapshot previous values
      const previousBoards = queryClient.getQueryData(["boards", workspaceId]);
      const previousBoardDetails = queryClient.getQueryData(["boardDetails", boardId]);
      
      // Update boards list optimistically
      queryClient.setQueryData(
        ["boards", workspaceId],
        (old: ApiResponse<Board[]> | undefined) => {
          if (!old) return { data: [] };
          
          return {
            ...old,
            data: (old.data ?? []).map(board =>
              board.id === boardId ? { ...board, ...updates } : board
            )
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
              data: { ...(old.data ?? {}), ...updates }
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
          queryClient.setQueryData(["boards", workspaceId], context.previousBoards);
        }
        if (context.previousBoardDetails) {
          queryClient.setQueryData(["boardDetails", context.boardId], context.previousBoardDetails);
        }
      }
    },
    // Always reconcile
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["boardDetails", variables.boardId] });
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
export function useBoardDetails(boardId: string) {
  const queryClient = useQueryClient();
  
  // Main query for board details
  const boardDetailsQuery = useQuery({
    queryKey: ["boardDetails", boardId],
    queryFn: () => boardDetails(boardId),
    enabled: !!boardId,
  });

  // Update board details mutation
  const updateBoardDetailsMutation = useMutation({
    mutationFn: (updates: Partial<Board>) => {
      return api.patch(`/board/${boardId}`, updates);
    },
    // Optimistic update
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["boardDetails", boardId] });
      
      // Snapshot previous value
      const previousDetails = queryClient.getQueryData(["boardDetails", boardId]);
      
      // Update optimistically
      queryClient.setQueryData(
        ["boardDetails", boardId],
        (old: ApiResponse<Board> | undefined) => {
          if (!old) return undefined;
          
          return {
            ...old,
            data: { ...(old.data ?? {}), ...updates }
          };
        }
      );
      
      return { previousDetails };
    },
    // Roll back on error
    onError: (err, updates, context) => {
      if (context?.previousDetails) {
        queryClient.setQueryData(["boardDetails", boardId], context.previousDetails);
      }
    },
    // Always reconcile
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boardDetails", boardId] });
      // Invalidate the boards list that might contain this board
      queryClient.invalidateQueries({ 
        queryKey: ["boards"],
        predicate: (query) => {
          // Only invalidate if it's a root boards query (not a specific board)
          return query.queryKey.length > 1;
        }
      });
    },
  });

  return {
    board: boardDetailsQuery.data?.data,
    isLoading: boardDetailsQuery.isLoading,
    isError: boardDetailsQuery.isError,
    error: boardDetailsQuery.error,
    updateBoard: updateBoardDetailsMutation.mutate,
    isUpdating: updateBoardDetailsMutation.isPending,
  };
}
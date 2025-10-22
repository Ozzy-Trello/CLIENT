import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lists, moveList, deleteList } from "../api/list";
import { deleteAllCardsInList } from "../api/card";
import { api } from "../api";
import { AnyList } from "../types/list";
import { ApiResponse } from "../types/type";
import { queryKeys } from "../constants/query-keys";

export function useLists(boardId: string) {
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ["lists", boardId],
    queryFn: () => lists(boardId),
    enabled: !!boardId,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const addListMutation = useMutation({
    mutationFn: (newList: Partial<AnyList>) =>
      api.post("/list", newList, {
        headers: { "board-id": boardId },
      }),
    onMutate: async (newList) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
      const previousLists = queryClient.getQueryData(["lists", boardId]);

      const tempList = {
        ...newList,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["lists", boardId],
        (old: ApiResponse<AnyList[]> | undefined) => {
          if (!old) return { data: [tempList] };
          return {
            ...old,
            data: [...(old.data ?? []), tempList],
          };
        }
      );

      return { previousLists };
    },
    onError: (_err, _newList, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", boardId], context.previousLists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({
      listId,
      updates,
    }: {
      listId: string;
      updates: Partial<AnyList>;
    }) =>
      api.put(`/list/${listId}`, updates, {
        headers: { "board-id": boardId },
      }),
    onMutate: async ({ listId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
      const previousLists = queryClient.getQueryData(["lists", boardId]);

      queryClient.setQueryData(
        ["lists", boardId],
        (old: ApiResponse<AnyList[]> | undefined) => {
          if (!old) return { data: [] };
          return {
            ...old,
            data: old.data?.map((list) =>
              list.id === listId ? { ...list, ...updates } : list
            ),
          };
        }
      );

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", boardId], context.previousLists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => deleteList(listId, boardId),
    onMutate: async ({ listId }) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
      const previousLists = queryClient.getQueryData(["lists", boardId]);

      queryClient.setQueryData(
        ["lists", boardId],
        (old: ApiResponse<AnyList[]> | undefined) => {
          if (!old) return { data: [] };
          return {
            ...old,
            data: old.data?.filter((list) => list.id !== listId),
          };
        }
      );

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", boardId], context.previousLists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
  });

  return {
    lists: (listsQuery.data?.data || []).sort(
      (a, b) => (a.position || 0) - (b.position || 0)
    ),
    pagination: listsQuery.data?.paginate,
    isLoading: listsQuery.isLoading,
    isError: listsQuery.isError,
    error: listsQuery.error,
    addList: addListMutation.mutate,
    updateList: updateListMutation.mutate,
    deleteList: deleteListMutation.mutate,
    isAddingList: addListMutation.isPending,
    isUpdatingList: updateListMutation.isPending,
    isDeletingList: deleteListMutation.isPending,
  };
}

/**
 * Hook to manage list movement within a board
 */
export function useListMove() {
  const queryClient = useQueryClient();

  const listMoveMutation = useMutation({
    mutationFn: ({
      listId,
      previousPosition,
      targetPosition,
      boardId,
    }: {
      listId: string;
      previousPosition: number;
      targetPosition: number;
      boardId: string;
    }) => moveList(listId, previousPosition, targetPosition, boardId),

    onMutate: async ({ listId, targetPosition, boardId }) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });

      const previousLists = queryClient.getQueryData<ApiResponse<AnyList[]>>([
        "lists",
        boardId,
      ]);

      queryClient.setQueryData<ApiResponse<AnyList[]>>(
        ["lists", boardId],
        (old) => {
          if (!old?.data) return old;

          const lists = [...old.data];
          const fromIndex = lists.findIndex((l) => l.id === listId);
          if (fromIndex === -1) return old;

          const [moved] = lists.splice(fromIndex, 1);
          const toIndex = Math.min(targetPosition, lists.length);
          lists.splice(toIndex, 0, moved);

          // Recalculate position based on neighbors
          for (let i = 0; i < lists.length; i++) {
            lists[i].position = (i + 1) * 10000;
          }

          return { ...old, data: lists };
        }
      );

      return { previousLists };
    },

    onError: (_err, vars, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(
          ["lists", vars.boardId],
          context.previousLists
        );
      }
    },

    onSuccess: (_res, vars) => {
      // Let the optimistic UI stay — only sync if absolutely needed
      queryClient.invalidateQueries({ queryKey: ["lists", vars.boardId] });
    },
  });

  return {
    moveList: listMoveMutation.mutate,
    isMovingList: listMoveMutation.isPending,
    moveListError: listMoveMutation.error,
  };
}

/**
 * Hook to delete all cards in a list
 */
export function useDeleteAllCardsInList() {
  const queryClient = useQueryClient();

  const deleteAllCardsMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => deleteAllCardsInList(listId),

    onMutate: async ({ listId }) => {
      // Cancel any outgoing refetches for the specific list
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lists.all });

      // Snapshot the previous value
      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));
      const previousLists = queryClient.getQueryData(queryKeys.lists.all);

      // Optimistically update the specific cards list to empty
      queryClient.setQueryData(queryKeys.cards.list(listId), (old: any) => {
        if (!old) return { data: [], paginate: { totalData: 0 } };

        return {
          ...old,
          data: [], // Clear all cards from this list
          paginate: {
            ...old.paginate,
            totalData: 0, // Update total count to 0
          },
        };
      });

      // Also update lists cache if it exists
      queryClient.setQueriesData({ queryKey: queryKeys.lists.all }, (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((list: any) => {
            if (list.id === listId) {
              return {
                ...list,
                cards: [], // Clear all cards from this list
              };
            }
            return list;
          }),
        };
      });

      return { previousCards, previousLists };
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousCards) {
        queryClient.setQueryData(queryKeys.cards.list(_vars.listId), context.previousCards);
      }
      if (context?.previousLists) {
        queryClient.setQueryData(queryKeys.lists.all, context.previousLists);
      }
    },

    onSettled: (data, error, variables) => {
      // Always refetch after error or success - use specific query keys
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      // Also invalidate any dashcard queries that might depend on card counts
      queryClient.invalidateQueries({ queryKey: ["dashcardCount"], exact: false });
    },
  });

  return {
    deleteAllCards: deleteAllCardsMutation.mutate,
    isDeletingAllCards: deleteAllCardsMutation.isPending,
    deleteAllCardsError: deleteAllCardsMutation.error,
  };
}

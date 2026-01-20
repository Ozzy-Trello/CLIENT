import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lists, moveList, deleteList, archiveList, unarchiveList, moveAllCardsInList, sortListCards } from "../api/list";
import { deleteAllCardsInList, archiveAllCardsInList } from "../api/card";
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
 * Hook to archive a list (remove from active board)
 */
export function useArchiveList(boardId: string) {
  const queryClient = useQueryClient();

  const archiveListMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => archiveList(listId, boardId),
    onMutate: async ({ listId }) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
      const previousLists = queryClient.getQueryData<ApiResponse<AnyList[]>>([
        "lists",
        boardId,
      ]);

      // Optimistically remove the list
      queryClient.setQueryData<ApiResponse<AnyList[]>>([
        "lists",
        boardId,
      ], (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((l) => l.id !== listId) };
      });

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

  const unarchiveListMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => unarchiveList(listId, boardId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
  });

  return {
    archiveList: archiveListMutation.mutate,
    isArchivingList: archiveListMutation.isPending,
    unarchiveList: unarchiveListMutation.mutate,
    isUnarchivingList: unarchiveListMutation.isPending,
  };
}

/**
 * Hook to move all cards from one list to another
 */
export function useMoveAllCardsInList() {
  const queryClient = useQueryClient();

  const moveAllCardsMutation = useMutation({
    mutationFn: ({ sourceListId, targetListId }: { sourceListId: string; targetListId: string }) =>
      moveAllCardsInList(sourceListId, targetListId),

    onMutate: async ({ sourceListId, targetListId }) => {
      // Cancel queries for both lists
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(sourceListId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(targetListId) });

      const previousSourceCards = queryClient.getQueryData(queryKeys.cards.list(sourceListId));
      const previousTargetCards = queryClient.getQueryData(queryKeys.cards.list(targetListId));

      // Optimistically move all cards: clear source, append to target
      const sourceData = previousSourceCards as ApiResponse<any> | undefined;
      const targetData = previousTargetCards as ApiResponse<any> | undefined;

      const cardsToMove = sourceData?.data || [];

      queryClient.setQueryData(queryKeys.cards.list(sourceListId), (old: any) => {
        return {
          ...old,
          data: [],
          paginate: {
            ...old?.paginate,
            totalData: 0,
          },
        };
      });

      queryClient.setQueryData(queryKeys.cards.list(targetListId), (old: any) => {
        const existing = old?.data || [];
        return {
          ...old,
          data: [...existing, ...cardsToMove.map((c: any) => ({ ...c, listId: targetListId }))],
          paginate: {
            ...old?.paginate,
            totalData: (old?.paginate?.totalData || existing.length) + cardsToMove.length,
          },
        };
      });

      return { previousSourceCards, previousTargetCards };
    },

    onError: (_err, vars, context) => {
      if (context?.previousSourceCards) {
        queryClient.setQueryData(queryKeys.cards.list(vars.sourceListId), context.previousSourceCards);
      }
      if (context?.previousTargetCards) {
        queryClient.setQueryData(queryKeys.cards.list(vars.targetListId), context.previousTargetCards);
      }
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.sourceListId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.targetListId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });

  return {
    moveAllCards: moveAllCardsMutation.mutate,
    isMovingAllCards: moveAllCardsMutation.isPending,
  };
}

/**
 * Hook to archive all cards in a list
 */
export function useArchiveAllCardsInList() {
  const queryClient = useQueryClient();

  const archiveAllCardsMutation = useMutation({
    mutationFn: ({ listId }: { listId: string }) => archiveAllCardsInList(listId),

    onMutate: async ({ listId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.lists.all });

      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));
      const previousLists = queryClient.getQueryData(queryKeys.lists.all);

      // Optimistically clear cards from the list (moved to archive)
      queryClient.setQueryData(queryKeys.cards.list(listId), (old: any) => {
        if (!old) return { data: [], paginate: { totalData: 0 } };
        return {
          ...old,
          data: [],
          paginate: { ...old.paginate, totalData: 0 },
        };
      });

      queryClient.setQueriesData({ queryKey: queryKeys.lists.all }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((list: any) => (list.id === listId ? { ...list, cards: [] } : list)),
        };
      });

      return { previousCards, previousLists };
    },

    onError: (_err, vars, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(queryKeys.cards.list(vars.listId), context.previousCards);
      }
      if (context?.previousLists) {
        queryClient.setQueryData(queryKeys.lists.all, context.previousLists);
      }
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.archived() });
    },
  });

  return {
    archiveAllCards: archiveAllCardsMutation.mutate,
    isArchivingAllCards: archiveAllCardsMutation.isPending,
  };
}

/**
 * Hook to sort cards in a list
 */
export function useSortListCards() {
  const queryClient = useQueryClient();

  const sortListCardsMutation = useMutation({
    mutationFn: ({ listId, sortBy, direction }: { listId: string; sortBy: "name" | "createdAt" | "updatedAt" | "dueDate" | "position"; direction: "asc" | "desc" }) =>
      sortListCards(listId, sortBy, direction),

    onMutate: async ({ listId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.list(listId) });
      const previousCards = queryClient.getQueryData(queryKeys.cards.list(listId));
      return { previousCards };
    },

    onError: (_err, vars, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(queryKeys.cards.list(vars.listId), context.previousCards);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.list(variables.listId) });
    },
  });

  return {
    sortListCards: sortListCardsMutation.mutate,
    isSortingListCards: sortListCardsMutation.isPending,
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
    },
  });

  return {
    deleteAllCards: deleteAllCardsMutation.mutate,
    isDeletingAllCards: deleteAllCardsMutation.isPending,
    deleteAllCardsError: deleteAllCardsMutation.error,
  };
}

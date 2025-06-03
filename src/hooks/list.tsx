import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lists, moveList } from "../api/list";
import { api } from "../api";
import { AnyList } from "../types/list";
import { ApiResponse } from "../types/type";

export function useLists(boardId: string) {
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ["lists", boardId],
    queryFn: () => lists(boardId),
    enabled: !!boardId,
    staleTime: 5000,
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
    mutationFn: ({ listId, updates }: { listId: string; updates: Partial<AnyList> }) =>
      api.put(`/list/${listId}`, updates),
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

  return {
    lists: (listsQuery.data?.data || []).sort((a, b) => (a.position || 0) - (b.position || 0)),
    pagination: listsQuery.data?.paginate,
    isLoading: listsQuery.isLoading,
    isError: listsQuery.isError,
    error: listsQuery.error,
    addList: addListMutation.mutate,
    updateList: updateListMutation.mutate,
    isAddingList: addListMutation.isPending,
    isUpdatingList: updateListMutation.isPending,
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

      const previousLists = queryClient.getQueryData<ApiResponse<AnyList[]>>(["lists", boardId]);

      queryClient.setQueryData<ApiResponse<AnyList[]>>(["lists", boardId], (old) => {
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
      });

      return { previousLists };
    },

    onError: (_err, vars, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", vars.boardId], context.previousLists);
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


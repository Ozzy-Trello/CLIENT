import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lists } from "../api/list";
import { api } from "../api";
import { AnyList } from "../types/list";
import { ApiResponse } from "../types/type";

export function useLists(boardId: string) {
  const queryClient = useQueryClient();
 
  // The main query for lists
  const listsQuery = useQuery({
    queryKey: ["lists", boardId],
    queryFn: () => lists(boardId),
    enabled: !!boardId,
    staleTime: 5000,
  });

  // Add a new list mutation with optimistic updates
  const addListMutation = useMutation({
    mutationFn: (newList: Partial<AnyList>) => {
      return api.post("/list", newList, {
        headers: { 'board-id': boardId }
      });
    },
    onMutate: async (newList) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
      const previousLists = queryClient.getQueryData(["lists", boardId]);
     
      // Create a temporary ID for the optimistic update
      const tempList = {
        ...newList,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
     
      // Optimistically update the UI
      queryClient.setQueryData(
        ["lists", boardId],
        (old: ApiResponse<AnyList[]> | undefined) => {
          if (!old) return { data: [tempList] };
          return {
            ...old,
            data: [...(old.data ?? []), tempList]
          };
        }
      );
     
      return { previousLists };
    },
    onError: (err, newList, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", boardId], context.previousLists);
      }
    },
    onSettled: () => {
      // This will reconcile any differences between our optimistic update and the actual server state
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
  });

  // Update a list title mutation
  const updateListMutation = useMutation({
    mutationFn: ({ listId, updates }: { listId: string; updates: Partial<AnyList> }) => {
      return api.put(`/list/${listId}`, updates);
    },
    onMutate: async ({ listId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
     
      const previousLists = queryClient.getQueryData(["lists", boardId]);
     
      // Optimistically update the UI
      queryClient.setQueryData(
        ["lists", boardId],
        (old: ApiResponse<AnyList[]> | undefined) => {
          if (!old) return { data: [] };
         
          return {
            ...old,
            data: (old.data ?? []).map(list =>
              list.id === listId ? { ...list, ...updates } : list
            )
          };
        }
      );
     
      return { previousLists };
    },
    onError: (err, variables, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", boardId], context.previousLists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    },
  });

  return {
    lists: listsQuery.data?.data || [],
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
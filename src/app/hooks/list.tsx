import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { lists, moveList } from "../api/list";
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
      boardId
    }: {
      listId: string;
      previousPosition: number;
      targetPosition: number;
      boardId: string;
    }) => {
      return moveList(
        listId, 
        previousPosition, 
        targetPosition,
        boardId
      );
    },
    onMutate: async ({ listId, previousPosition, targetPosition, boardId }) => {
      console.log("Optimistically moving list:", { listId, previousPosition, targetPosition });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["lists", boardId] });
      
      // Get a snapshot of the current state
      const previousListsData = queryClient.getQueryData<ApiResponse<any[]>>(["lists", boardId]);
      
      // Deep clone to avoid reference issues
      const clonedListsData = previousListsData 
        ? JSON.parse(JSON.stringify(previousListsData)) 
        : null;
      
      // Update the lists in cache for optimistic UI
      queryClient.setQueryData<ApiResponse<any[]>>(
        ["lists", boardId],
        (old) => {
          if (!old?.data || !Array.isArray(old.data)) return old;
          
          const lists = JSON.parse(JSON.stringify(old.data));
          
          // Find the list being moved and its current index
          const listIndex = lists.findIndex((list: any) => list.id === listId);
          if (listIndex === -1) return old; // List not found
          
          // Remove the list from its current position
          const [movedList] = lists.splice(listIndex, 1);
          
          // If we don't have a target position, default to the end
          const insertPosition = targetPosition !== undefined 
            ? Math.min(targetPosition, lists.length) 
            : lists.length;
          
          // Insert the list at the target position
          lists.splice(insertPosition, 0, movedList);
          
          // Update order values for all lists to maintain visual consistency
          lists.forEach((list: any, idx: number) => {
            list.order = (idx + 1) * 10000;
          });
          
          return {
            ...old,
            data: lists
          };
        }
      );
      
      return { previousLists: clonedListsData };
    },
    onError: (error, variables, context) => {
      console.error("Error moving list:", error);
      
      // Revert to snapshot on error
      if (context?.previousLists) {
        queryClient.setQueryData(["lists", variables.boardId], context.previousLists);
      }
    },
    onSettled: (data, error, variables) => {
      // Use a delay to ensure the UI transition completes before refetching
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["lists", variables.boardId] });
      }, 500);
    }
  });
  
  return {
    moveList: listMoveMutation.mutate,
    isMovingList: listMoveMutation.isPending,
    moveListError: listMoveMutation.error
  };
}
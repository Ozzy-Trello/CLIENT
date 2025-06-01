import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  createChecklist, 
  deleteChecklist, 
  getChecklistById, 
  getChecklistsByCardId, 
  updateChecklist 
} from "../api/checklist";
import { ChecklistDTO, ChecklistItem, CreateChecklistDTO, UpdateChecklistDTO } from "../types/checklist";

/**
 * Hook to fetch all checklists for a card
 */
export function useCardChecklists(cardId: string) {
  return useQuery({
    queryKey: ['checklists', cardId],
    queryFn: () => getChecklistsByCardId(cardId),
    enabled: !!cardId,
    select: (data) => data.data || [],
  });
}

/**
 * Hook to fetch a specific checklist by ID
 */
export function useChecklist(checklistId: string) {
  return useQuery({
    queryKey: ['checklist', checklistId],
    queryFn: () => getChecklistById(checklistId),
    enabled: !!checklistId,
    select: (data) => data.data,
  });
}

/**
 * Hook to create a new checklist
 */
export function useCreateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateChecklistDTO) => createChecklist(data),
    onSuccess: (_, variables) => {
      // Invalidate all checklists queries and specifically the card's checklists
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      queryClient.invalidateQueries({ queryKey: ['checklists', variables.card_id] });
    },
  });
}

/**
 * Hook to update an existing checklist
 */
export function useUpdateChecklist(checklistId: string, cardId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdateChecklistDTO) => updateChecklist(checklistId, data),
    onSuccess: () => {
      // Invalidate the specific checklist and all checklists for this card
      queryClient.invalidateQueries({ queryKey: ['checklist', checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] });
    },
  });
}

/**
 * Hook to delete a checklist
 */
export function useDeleteChecklist(cardId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (checklistId: string) => deleteChecklist(checklistId),
    onSuccess: () => {
      // Invalidate all checklists for this card
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] });
    },
  });
}

/**
 * Hook to add a new item to a checklist
 */
export function useAddChecklistItem(cardId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklistId, title, newItem }: { checklistId: string, title: string, newItem: ChecklistItem }) => {
      // First get the current checklist
      const currentChecklist = await getChecklistById(checklistId);
      
      if (!currentChecklist.data) {
        throw new Error("Checklist not found");
      }
      
      // Add the new item to the data array
      const updatedData = [...currentChecklist.data.data, newItem];
      
      // Update the checklist with the new data
      return updateChecklist(checklistId, {
        title,
        data: updatedData
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific checklist and all checklists for this card
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] });
    },
  });
}

/**
 * Hook to toggle a checklist item's checked status
 */
export function useToggleChecklistItem(cardId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklistId, itemIndex }: { checklistId: string, itemIndex: number }) => {
      // First get the current checklist
      const currentChecklist = await getChecklistById(checklistId);
      
      if (!currentChecklist.data) {
        throw new Error("Checklist not found");
      }
      
      // Create a copy of the data array
      const updatedData = [...currentChecklist.data.data];
      
      // Toggle the checked status of the specified item
      if (updatedData[itemIndex]) {
        updatedData[itemIndex] = {
          ...updatedData[itemIndex],
          checked: !updatedData[itemIndex].checked
        };
      }
      
      // Update the checklist with the new data
      return updateChecklist(checklistId, {
        title: currentChecklist.data.title,
        data: updatedData
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific checklist and all checklists for this card
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] });
    },
  });
}

/**
 * Hook to remove an item from a checklist
 */
export function useRemoveChecklistItem(cardId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklistId, itemIndex }: { checklistId: string, itemIndex: number }) => {
      // First get the current checklist
      const currentChecklist = await getChecklistById(checklistId);
      
      if (!currentChecklist.data) {
        throw new Error("Checklist not found");
      }
      
      // Create a copy of the data array without the specified item
      const updatedData = currentChecklist.data.data.filter((_: ChecklistItem, index: number) => index !== itemIndex);
      
      // Update the checklist with the new data
      return updateChecklist(checklistId, {
        title: currentChecklist.data.title,
        data: updatedData
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific checklist and all checklists for this card
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] });
    },
  });
}

/**
 * Hook to update a checklist item
 */
export function useUpdateChecklistItem(cardId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklistId, itemIndex, updatedItem }: { checklistId: string, itemIndex: number, updatedItem: ChecklistItem }) => {
      // First get the current checklist
      const currentChecklist = await getChecklistById(checklistId);
      
      if (!currentChecklist.data) {
        throw new Error("Checklist not found");
      }
      
      // Create a copy of the data array
      const updatedData = [...currentChecklist.data.data];
      
      // Update the specified item
      if (updatedData[itemIndex]) {
        updatedData[itemIndex] = updatedItem;
      }
      
      // Update the checklist with the new data
      return updateChecklist(checklistId, {
        title: currentChecklist.data.title,
        data: updatedData
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific checklist and all checklists for this card
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.checklistId] });
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] });
    },
  });
}

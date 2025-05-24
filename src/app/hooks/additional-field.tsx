import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdditionalField,
  deleteAdditionalField,
  getAdditionalFieldById,
  getAdditionalFieldsByCardId,
  updateAdditionalField,
  updateAdditionalFieldItem,
  addAdditionalFieldItem,
  removeAdditionalFieldItem,
} from "../api/additional-field";
import { AdditionalFieldItem } from "../types/additional-field";

/**
 * Hook to fetch all additional fields for a card
 */
export function useCardAdditionalFields(cardId: string) {
  return useQuery({
    queryKey: ["additionalFields", cardId],
    queryFn: () => getAdditionalFieldsByCardId(cardId),
    enabled: !!cardId,
    select: (data) => data.data || [],
  });
}

/**
 * Hook to create a new additional field
 */
export function useCreateAdditionalField(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => createAdditionalField(cardId, data),
    onSuccess: () => {
      // Invalidate all additional fields queries for this card
      queryClient.invalidateQueries({ queryKey: ["additionalFields", cardId] });
    },
  });
}

/**
 * Hook to update an existing additional field
 */
export function useUpdateAdditionalField(
  additionalFieldId: string,
  cardId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => updateAdditionalField(additionalFieldId, data),
    onSuccess: () => {
      // Invalidate all additional fields for this card
      queryClient.invalidateQueries({ queryKey: ["additionalFields", cardId] });
    },
  });
}

/**
 * Hook to update a specific item in an additional field
 */
export function useUpdateAdditionalFieldItem(
  additionalFieldId: string,
  cardId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      itemData,
    }: {
      itemId: string;
      itemData: Partial<AdditionalFieldItem>;
    }) => updateAdditionalFieldItem(additionalFieldId, itemId, itemData),
    onSuccess: () => {
      // Invalidate all additional fields for this card
      queryClient.invalidateQueries({ queryKey: ["additionalFields", cardId] });
    },
  });
}

/**
 * Hook to add a new item to an additional field
 */
export function useAddAdditionalFieldItem(
  additionalFieldId: string,
  cardId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemData: AdditionalFieldItem) =>
      addAdditionalFieldItem(additionalFieldId, itemData),
    onSuccess: () => {
      // Invalidate all additional fields for this card
      queryClient.invalidateQueries({ queryKey: ["additionalFields", cardId] });
    },
  });
}

/**
 * Hook to remove an item from an additional field
 */
export function useRemoveAdditionalFieldItem(
  additionalFieldId: string,
  cardId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      removeAdditionalFieldItem(additionalFieldId, itemId),
    onSuccess: () => {
      // Invalidate all additional fields for this card
      queryClient.invalidateQueries({ queryKey: ["additionalFields", cardId] });
    },
  });
}

/**
 * Hook to delete an additional field
 */
export function useDeleteAdditionalField(cardId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (additionalFieldId: string) =>
      deleteAdditionalField(additionalFieldId),
    onSuccess: () => {
      // Invalidate all additional fields for this card
      queryClient.invalidateQueries({ queryKey: ["additionalFields", cardId] });
    },
  });
}

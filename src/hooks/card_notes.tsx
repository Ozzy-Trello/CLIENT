import {
  createCardNote,
  deleteCardNote,
  getCardNotes,
  setCardNoteDone,
  updateCardNote,
} from "@api/card_notes";
import { CreateCardNotePayload, UpdateCardNotePayload } from "@myTypes/card_note";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useCardNotes = (cardId?: string) => {
  const queryClient = useQueryClient();
  const enabled = !!cardId;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cardNotes", cardId],
    queryFn: () => getCardNotes(cardId!),
    enabled,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!enabled || !cardId) return;
    const socket = typeof window !== "undefined" ? (window as any).socket : null;
    if (!socket) return;

    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === "card_note:updated" && message.data?.cardId === cardId) {
          refetch();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [cardId, enabled, refetch]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cardNotes", cardId] });
    refetch();
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateCardNotePayload) => createCardNote(cardId!, payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateCardNotePayload }) =>
      updateCardNote(cardId!, noteId, payload),
    onSuccess: invalidate,
  });

  const doneMutation = useMutation({
    mutationFn: ({ noteId, done }: { noteId: string; done: boolean }) =>
      setCardNoteDone(cardId!, noteId, done),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCardNote(cardId!, noteId),
    onSuccess: invalidate,
  });

  return {
    notes: data?.data ?? [],
    isLoading,
    createNote: createMutation.mutateAsync,
    updateNote: updateMutation.mutateAsync,
    setDone: doneMutation.mutateAsync,
    deleteNote: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isSettingDone: doneMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

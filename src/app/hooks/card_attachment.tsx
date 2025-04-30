import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiResponse, CardAttachment, FileAttachment } from "../dto/types";
import { createCardAttachment, deleteCardAttachment, getCardAttachments } from "../api/card_attachment";


/**
 * Hook to manage card attachments
 */
export function useCardAttachment(cardId: string) {
  const queryClient = useQueryClient();
  
  // Main query for card attachments
  const cardAttachmentQuery = useQuery({
    queryKey: ["cardAttachment", cardId],
    queryFn: () => getCardAttachments(cardId),
    enabled: !!cardId,
    staleTime: 5000,
  });

  // Create attachment mutation with optimistic updates
  const addAttachmentMutation = useMutation({
    mutationFn: ({ 
      cardId, 
      fileId,
      isCover,
    }: { 
      cardId: string; 
      fileId: string;
      isCover: boolean;
    }) => {
      console.log("API - Adding attachment:", { cardId, fileId });
      return createCardAttachment({ cardId: cardId, fileId: fileId, isCover: isCover});
    },
    onMutate: async ({ cardId, fileId, isCover }) => {
      console.log("Optimistically adding attachment:", { cardId, fileId });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardAttachment", cardId] });
      
      // Snapshot previous value
      const previousAttachments = queryClient.getQueryData<ApiResponse<CardAttachment[]>>(["cardAttachment", cardId]);
      
      // Create temporary attachment for optimistic update
      const tempAttachment: CardAttachment = {
        id: `temp-${Date.now()}`,
        isCover: isCover,
        cardId: cardId,
        fileId: fileId,
        createdBy: "current-user", // This will be replaced when the server responds
        createdAt: new Date().toISOString(),
        file: {
          id: fileId,
          name: "Uploading...",
          url: "",
          size: 0,
          sizeUnit: "KB",
          mimeType: "",
          createdAt: new Date().toISOString(),
          createdBy: "current-user"
        }
      };

      // Update the UI optimistically
      queryClient.setQueryData<ApiResponse<CardAttachment[]>>(
        ["cardAttachment", cardId],
        (old) => {
          if (!old) return { data: [tempAttachment] };
          
          const oldData = old.data || [];
          // Make sure old.data is an array
          const safeOldData = Array.isArray(oldData) ? oldData : [];
          
          return {
            ...old,
            data: [...safeOldData, tempAttachment]
          };
        }
      );
      
      // Also update the card data in cache if it exists
      updateCardAttachmentsInCache(queryClient, cardId, tempAttachment, "add");
      
      return { previousAttachments };
    },
    onError: (err, variables, context) => {
      console.error("Error adding attachment:", err);
      if (context?.previousAttachments) {
        queryClient.setQueryData(
          ["cardAttachment", variables.cardId], 
          context.previousAttachments
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("Successfully added attachment:", data);
    },
    onSettled: (data, error, variables) => {
      console.log("Add attachment settled, invalidating queries");
      queryClient.invalidateQueries({ 
        queryKey: ["cardAttachment", variables.cardId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["cards"]
      });
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: ({
      attachmentId,
      cardId
    }: {
      attachmentId: string;
      cardId: string;
    }) => {
      console.log("API - Deleting attachment:", { attachmentId, cardId });
      return deleteCardAttachment(attachmentId);
    },
    onMutate: async ({ attachmentId, cardId }) => {
      console.log("Optimistically deleting attachment:", { attachmentId, cardId });
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cardAttachment", cardId] });
      
      // Snapshot previous value
      const previousAttachments = queryClient.getQueryData<ApiResponse<CardAttachment[]>>(["cardAttachment", cardId]);
      
      // Find the attachment to be deleted for updating card cache
      let attachmentToDelete: CardAttachment | undefined;
      if (previousAttachments?.data) {
        attachmentToDelete = previousAttachments.data.find(att => att.id === attachmentId);
      }
      
      // Update the UI optimistically
      queryClient.setQueryData<ApiResponse<CardAttachment[]>>(
        ["cardAttachment", cardId],
        (old) => {
          if (!old) return { data: [] };
          
          const oldData = old.data || [];
          // Make sure old.data is an array
          const safeOldData = Array.isArray(oldData) ? oldData : [];
          
          return {
            ...old,
            data: safeOldData.filter(attachment => attachment.id !== attachmentId)
          };
        }
      );
      
      // Also update the card data in cache if it exists
      if (attachmentToDelete) {
        updateCardAttachmentsInCache(queryClient, cardId, attachmentToDelete, "delete");
      }
      
      return { previousAttachments };
    },
    onError: (err, variables, context) => {
      console.error("Error deleting attachment:", err);
      if (context?.previousAttachments) {
        queryClient.setQueryData(
          ["cardAttachment", variables.cardId], 
          context.previousAttachments
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("Successfully deleted attachment:", data);
    },
    onSettled: (data, error, variables) => {
      console.log("Delete attachment settled, invalidating queries");
      queryClient.invalidateQueries({ 
        queryKey: ["cardAttachment", variables.cardId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["cards"]
      });
    },
  });

  // Helper function to update card in cache when attachments change
  function updateCardAttachmentsInCache(
    queryClient: any,
    cardId: string,
    attachment: CardAttachment,
    action: "add" | "delete"
  ) {
    try {
      // Update card data in the cards cache
      queryClient.setQueriesData(
        { queryKey: ["cards"] },
        (old: any) => {
          if (!old || !old.data) return old;
          
          const oldData = old.data || [];
          // Ensure old.data is an array before mapping
          const safeData = Array.isArray(oldData) ? oldData : [];
          
          return {
            ...old,
            data: safeData.map((card: any) => {
              if (card.id === cardId) {
                // Deep clone to avoid mutation
                const updatedCard = { ...card };
                
                // Initialize attachments array if it doesn't exist
                if (!updatedCard.attachments) {
                  updatedCard.attachments = [];
                }
                
                const cardAttachments = updatedCard.attachments || [];
                // Ensure attachments is an array
                const safeAttachments = Array.isArray(cardAttachments) ? cardAttachments : [];
                
                if (action === "delete") {
                  // Remove the attachment
                  updatedCard.attachments = safeAttachments.filter(
                    (att: any) => att.id !== attachment.id
                  );
                } else if (action === "add") {
                  // Add new attachment
                  updatedCard.attachments = [
                    ...safeAttachments,
                    attachment
                  ];
                }
                
                return updatedCard;
              }
              return card;
            })
          };
        }
      );

      // Also update lists cache if it contains cards
      queryClient.setQueriesData(
        { queryKey: ["lists"] },
        (old: any) => {
          if (!old || !old.data) return old;
          
          const oldData = old.data || [];
          // Ensure old.data is an array before mapping
          const safeData = Array.isArray(oldData) ? oldData : [];
          
          return {
            ...old,
            data: safeData.map((list: any) => {
              if (!list.cards) return list;
              
              const listCards = list.cards || [];
              // Ensure list.cards is an array
              const safeCards = Array.isArray(listCards) ? listCards : [];
              
              return {
                ...list,
                cards: safeCards.map((card: any) => {
                  if (card.id === cardId) {
                    // Deep clone to avoid mutation
                    const updatedCard = { ...card };
                    
                    // Initialize attachments array if it doesn't exist
                    if (!updatedCard.attachments) {
                      updatedCard.attachments = [];
                    }
                    
                    const cardAttachments = updatedCard.attachments || [];
                    // Ensure attachments is an array
                    const safeAttachments = Array.isArray(cardAttachments) ? cardAttachments : [];
                    
                    if (action === "delete") {
                      // Remove the attachment
                      updatedCard.attachments = safeAttachments.filter(
                        (att: any) => att.id !== attachment.id
                      );
                    } else if (action === "add") {
                      // Add new attachment
                      updatedCard.attachments = [
                        ...safeAttachments,
                        attachment
                      ];
                    }
                    
                    return updatedCard;
                  }
                  return card;
                })
              };
            })
          };
        }
      );
    } catch (error) {
      console.error("Error in updateCardAttachmentsInCache:", error);
    }
  }

  return {
    cardAttachments: cardAttachmentQuery.data?.data || [],
    isLoading: cardAttachmentQuery.isLoading,
    isError: cardAttachmentQuery.isError,
    error: cardAttachmentQuery.error,
    addAttachment: addAttachmentMutation.mutate,
    deleteAttachment: deleteAttachmentMutation.mutate,
    isAddingAttachment: addAttachmentMutation.isPending,
    isDeletingAttachment: deleteAttachmentMutation.isPending,
  };
}
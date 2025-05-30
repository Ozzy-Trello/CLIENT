import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getCardMember, addMember as apiAddMember, removeMember } from "../api/card_member";
import { ApiResponse } from "@myTypes/type";
import { User } from "@dto/types";

export const useCardMembers = (cardId: string) => {
  const queryClient = useQueryClient();
 
  const cardMembersQuery = useQuery({
    queryKey: ["cardMembers", cardId],
    queryFn: () => getCardMember(cardId),
    enabled: !!cardId,
    staleTime: 30000, // 30 seconds
  });

  // Add member mutation with optimistic update
  const addMemberMutation = useMutation({
    mutationFn: ({ userIds }: { userIds: string[] }) => apiAddMember(cardId, userIds as []),
    onMutate: async ({ userIds }) => {      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ["cardMembers", cardId] 
      });

      // Snapshot the previous value
      const previousCardMembers = queryClient.getQueryData<ApiResponse<User[]>>(
        ["cardMembers", cardId]
      );

      // Optimistically update to the new value
      if (previousCardMembers?.data) {
        // Create optimistic user objects for new users
        const optimisticUsers: User[] = userIds.map(userId => ({
          id: userId,
          name: 'Loading...', // Placeholder name
          email: '',
          username: '',
          // Add other optional User properties as needed
        } as User));

        // Filter out users that are already members to avoid duplicates
        const existingUserIds = previousCardMembers.data.map(user => user.id);
        const newUsers = optimisticUsers.filter(user => 
          !existingUserIds.includes(user.id)
        );

        const updatedMembers = [...previousCardMembers.data, ...newUsers];

        queryClient.setQueryData<ApiResponse<User[]>>(
          ["cardMembers", cardId],
          {
            ...previousCardMembers,
            data: updatedMembers
          }
        );
      }

      // Return a context object with the snapshotted value
      return { previousCardMembers };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCardMembers) {
        queryClient.setQueryData(
          ["cardMembers", cardId],
          context.previousCardMembers
        );
      }
    },
    onSuccess: (data) => {
      // Update with the actual server response
      if (data?.data) {
        queryClient.setQueryData<ApiResponse<User[]>>(
          ["cardMembers", cardId],
          data
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ["cardMembers", cardId] 
      });
    },
  });

  // Remove member mutation with optimistic update
  const removeMemberMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) => removeMember(cardId, userId),
    onMutate: async ({ userId }) => {
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ["cardMembers", cardId] 
      });

      // Snapshot the previous value
      const previousCardMembers = queryClient.getQueryData<ApiResponse<User[]>>(
        ["cardMembers", cardId]
      );

      // Optimistically update to the new value
      if (previousCardMembers?.data) {
        const updatedMembers = previousCardMembers.data.filter(
          user => user.id !== userId
        );

        queryClient.setQueryData<ApiResponse<User[]>>(
          ["cardMembers", cardId],
          {
            ...previousCardMembers,
            data: updatedMembers
          }
        );
      }

      // Return a context object with the snapshotted value
      return { previousCardMembers };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCardMembers) {
        queryClient.setQueryData(
          ["cardMembers", cardId],
          context.previousCardMembers
        );
      }
    },
    onSuccess: (data) => {
      // Update with the actual server response if it contains updated data
      if (data?.data) {
        console.log('📝 Setting members data from API response');
        queryClient.setQueryData<ApiResponse<User[]>>(
          ["cardMembers", cardId],
          data
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ["cardMembers", cardId] 
      });
    },
  });

  // Helper function to add multiple members
  const addMembers = (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    addMemberMutation.mutate({ userIds });
  };

  // Helper function to add a single member
  const addMember = (userId: string) => {
    addMembers([userId]);
  };

  // Helper function to remove a member
  const removeMemberById = (userId: string) => {
    removeMemberMutation.mutate({ userId });
  };

  // Helper function to check if a user is already a member
  const isMember = (userId: string): boolean => {
    const members = cardMembersQuery.data?.data || [];
    return members.some(user => user.id === userId);
  };

  // Helper function to get member by user ID
  const getMemberByUserId = (userId: string): User | undefined => {
    const members = cardMembersQuery.data?.data || [];
    return members.find(user => user.id === userId);
  };

  // Helper function to toggle member (add if not member, remove if member)
  const toggleMember = (userId: string) => {
    if (isMember(userId)) {
      removeMemberById(userId);
    } else {
      addMember(userId);
    }
  };

  // Helper function to get member display name
  const getMemberDisplayName = (user: User): string => {
    return user.fullname || user.name || user.username || user.email || 'Unknown User';
  };

  // Helper function to get all member IDs
  const getMemberIds = (): string[] => {
    const members = cardMembersQuery.data?.data || [];
    return members.map(user => user.id);
  };

  return {
    // Query data and state
    cardMembers: cardMembersQuery.data?.data || [],
    memberCount: cardMembersQuery.data?.data?.length || 0,
    isLoading: cardMembersQuery.isLoading,
    isError: cardMembersQuery.isError,
    error: cardMembersQuery.error,
    
    // Mutation functions
    addMember,
    addMembers,
    removeMember: removeMemberById,
    toggleMember,
    
    // Mutation states
    isAddingMember: addMemberMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    addMemberError: addMemberMutation.error,
    removeMemberError: removeMemberMutation.error,
    
    // Helper functions
    isMember,
    getMemberByUserId,
    getMemberDisplayName,
    getMemberIds,
    
    // Async versions for when you need promises
    addMemberAsync: addMemberMutation.mutateAsync,
    removeMemberAsync: removeMemberMutation.mutateAsync,
    
    // For debugging
    refetch: cardMembersQuery.refetch,
  };
};
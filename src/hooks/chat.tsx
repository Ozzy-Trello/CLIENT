import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getChatConversations,
  getChatMessages,
  getChatUsers,
  markChatMessagesRead,
  sendChatMessage,
} from "@api/chat";
import {
  MarkChatMessagesReadPayload,
  SendChatMessagePayload,
} from "@myTypes/chat";

export const chatQueryKeys = {
  all: ["chat"] as const,
  users: (query: string) => [...chatQueryKeys.all, "users", query] as const,
  conversations: () => [...chatQueryKeys.all, "conversations"] as const,
  messages: (peerUserId: string) =>
    [...chatQueryKeys.all, "messages", peerUserId] as const,
};

export function useChatUsers(query: string, enabled = true) {
  return useQuery({
    queryKey: chatQueryKeys.users(query),
    queryFn: () => getChatUsers(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useChatConversations(enabled = true) {
  return useQuery({
    queryKey: chatQueryKeys.conversations(),
    queryFn: () => getChatConversations(),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useChatMessages(peerUserId: string, enabled = true) {
  return useQuery({
    queryKey: chatQueryKeys.messages(peerUserId),
    queryFn: () => getChatMessages(peerUserId),
    enabled: enabled && !!peerUserId,
    staleTime: 10 * 1000,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendChatMessagePayload) => sendChatMessage(payload),
    onSuccess: (_response, variables) => {
      const peerUserId = variables.recipientId || variables.peerUserId || "";
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversations(),
      });
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(peerUserId),
      });
    },
  });
}

export function useMarkChatMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MarkChatMessagesReadPayload) =>
      markChatMessagesRead(payload),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.conversations(),
      });
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(variables.peerUserId),
      });
    },
  });
}

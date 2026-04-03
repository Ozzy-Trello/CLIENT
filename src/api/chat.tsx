import { api } from ".";
import {
  ChatConversation,
  ChatMessage,
  ChatMessageApiResponse,
  ChatMessagesApiResponse,
  ChatUser,
  ChatConversationsApiResponse,
  ChatUsersApiResponse,
  ReadChatMessagesPayload,
  SendChatMessagePayload,
} from "@myTypes/chat";

const extractArray = (value: any): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.messages)) {
    return value.messages;
  }

  if (Array.isArray(value?.users)) {
    return value.users;
  }

  if (Array.isArray(value?.conversations)) {
    return value.conversations;
  }

  if (Array.isArray(value?.data?.messages)) {
    return value.data.messages;
  }

  if (Array.isArray(value?.messages?.data)) {
    return value.messages.data;
  }

  return [];
};

const extractObject = (value: any): any => {
  if (!value) {
    return null;
  }

  if (value?.data && !Array.isArray(value.data)) {
    return value.data;
  }

  return value;
};

const resolveId = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "";
};

const resolveName = (user: any): string => {
  return (
    user?.name ||
    user?.fullname ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    "Unknown"
  );
};

const normalizeChatUser = (user: any): ChatUser => ({
  id: resolveId(user?.id, user?.userId, user?.user_id, user?.peerUserId),
  name: resolveName(user),
  username: user?.username ?? user?.userName,
  email: user?.email,
  avatar: user?.avatar ?? user?.avatarUrl ?? user?.avatar_url,
  isOnline: user?.isOnline ?? user?.is_online,
  unreadCount: user?.unreadCount ?? user?.unread_count ?? 0,
});

const normalizeChatMessage = (message: any): ChatMessage => {
  const sender = message?.sender ? normalizeChatUser(message.sender) : undefined;
  const recipient = message?.recipient
    ? normalizeChatUser(message.recipient)
    : undefined;

  return {
    id: resolveId(message?.id, message?.messageId, message?.message_id),
    peerUserId: resolveId(
      message?.peerUserId,
      message?.peer_user_id,
      message?.conversationPeerId,
      message?.conversation_peer_id
    ),
    senderId: resolveId(
      message?.senderId,
      message?.sender_id,
      sender?.id,
      message?.fromUserId,
      message?.from_user_id
    ),
    recipientId: resolveId(
      message?.recipientId,
      message?.recipient_id,
      recipient?.id,
      message?.toUserId,
      message?.to_user_id
    ),
    content: String(
      message?.content ?? message?.message ?? message?.text ?? message?.body ?? ""
    ),
    isRead: Boolean(message?.isRead ?? message?.is_read ?? false),
    createdAt:
      message?.createdAt ?? message?.created_at ?? new Date().toISOString(),
    updatedAt: message?.updatedAt ?? message?.updated_at,
    sender,
    recipient,
  };
};

const normalizeChatConversation = (conversation: any): ChatConversation => {
  const peerUser = normalizeChatUser(
    conversation?.peerUser ?? conversation?.user ?? conversation?.otherUser ?? conversation?.contact ?? {}
  );
  const lastMessageRaw =
    conversation?.lastMessage ??
    conversation?.last_message ??
    conversation?.message ??
    null;

  return {
    id: resolveId(
      conversation?.id,
      conversation?.conversationId,
      conversation?.conversation_id,
      peerUser?.id
    ),
    peerUserId: resolveId(
      conversation?.peerUserId,
      conversation?.peer_user_id,
      peerUser?.id,
      conversation?.userId,
      conversation?.user_id
    ),
    peerUser,
    lastMessage: lastMessageRaw ? normalizeChatMessage(lastMessageRaw) : null,
    unreadCount: Number(
      conversation?.unreadCount ?? conversation?.unread_count ?? 0
    ),
    updatedAt:
      conversation?.updatedAt ??
      conversation?.updated_at ??
      lastMessageRaw?.createdAt ??
      lastMessageRaw?.created_at,
  };
};

export const getChatUsers = async (): Promise<ChatUser[]> => {
  const { data } = await api.get<ChatUsersApiResponse>("/chat/users");
  return extractArray(data).map(normalizeChatUser);
};

export const getChatConversations = async (): Promise<ChatConversation[]> => {
  const { data } = await api.get<ChatConversationsApiResponse>(
    "/chat/conversations"
  );
  return extractArray(data).map(normalizeChatConversation);
};

export const getChatMessages = async (
  peerUserId: string
): Promise<ChatMessage[]> => {
  const { data } = await api.get<ChatMessagesApiResponse>(
    `/chat/messages/${peerUserId}`
  );
  const payload = extractObject(data);
  return extractArray(payload?.messages ?? payload).map(normalizeChatMessage);
};

export const sendChatMessage = async (
  payload: SendChatMessagePayload
): Promise<ChatMessage> => {
  const { data } = await api.post<ChatMessageApiResponse>(
    "/chat/messages",
    {
      recipientId: payload.peerUserId,
      message: payload.content,
    },
    {
      transformRequest: [(requestBody) => JSON.stringify(requestBody)],
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  const responsePayload = extractObject(data);
  const messagePayload = responsePayload?.message ?? responsePayload;
  const normalized = normalizeChatMessage(messagePayload);
  if (!normalized.peerUserId && payload.peerUserId) {
    normalized.peerUserId = payload.peerUserId;
  }
  return normalized;
};

export const markChatMessagesRead = async (
  payload: ReadChatMessagesPayload
): Promise<void> => {
  await api.patch(
    "/chat/messages/read",
    payload,
    {
      transformRequest: [(requestBody) => JSON.stringify(requestBody)],
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

export { normalizeChatConversation, normalizeChatMessage, normalizeChatUser };

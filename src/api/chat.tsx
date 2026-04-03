import { api } from ".";
import {
  ChatConversationSummary,
  ChatListResponse,
  ChatMarkReadData,
  ChatMessagesData,
  ChatResponse,
  ChatSendMessageData,
  ChatUserSummary,
  MarkChatMessagesReadPayload,
  SendChatMessagePayload,
} from "@myTypes/chat";

const normalizeUser = (raw: any): ChatUserSummary => ({
  id: raw?.id || "",
  username: raw?.username || raw?.name || raw?.email || raw?.id || "Unknown",
  profilePicture: raw?.profilePicture ?? raw?.profile_picture ?? null,
});

const normalizeConversation = (raw: any): ChatConversationSummary => {
  const peerUser = normalizeUser(raw?.peerUser ?? raw?.peer ?? raw?.user ?? {});
  const rawLastMessage = raw?.lastMessage ?? raw?.last_message ?? null;
  const lastMessage = rawLastMessage
    ? {
        ...rawLastMessage,
        id: rawLastMessage?.id || "",
        senderId: rawLastMessage?.senderId ?? rawLastMessage?.sender_id ?? "",
        recipientId:
          rawLastMessage?.recipientId ?? rawLastMessage?.recipient_id ?? "",
        message: rawLastMessage?.message ?? rawLastMessage?.content ?? "",
        isRead: Boolean(
          rawLastMessage?.isRead ?? rawLastMessage?.is_read ?? false,
        ),
        createdAt:
          rawLastMessage?.createdAt ??
          rawLastMessage?.created_at ??
          new Date().toISOString(),
        updatedAt:
          rawLastMessage?.updatedAt ??
          rawLastMessage?.updated_at ??
          rawLastMessage?.createdAt ??
          rawLastMessage?.created_at ??
          new Date().toISOString(),
      }
    : null;

  return {
    peerUser,
    lastMessage,
    unreadCount: Number(raw?.unreadCount ?? raw?.unread_count ?? 0),
  };
};

const toMessageData = (payload: any): ChatMessagesData => {
  const data = payload?.data ?? payload ?? {};
  const peerUser = data?.peerUser ?? payload?.peer ?? {
    id: "",
    username: "",
    profilePicture: null,
  };
  const list = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.messages)
      ? data.messages
      : [];

  return {
    peerUser,
    data: list,
  };
};

export const getChatUsers = async (
  query?: string,
): Promise<ChatResponse<ChatUserSummary[]>> => {
  const response = await api.get("/chat/users", {
    params: query ? { query } : undefined,
  });

  return response.data;
};

export const getChatConversations = async (
  page = 1,
  limit = 100,
): Promise<ChatListResponse<ChatConversationSummary[]>> => {
  const response = await api.get("/chat/conversations", {
    params: { page, limit },
  });

  const list = Array.isArray(response.data?.data)
    ? response.data.data
    : Array.isArray(response.data)
      ? response.data
      : [];

  return {
    ...response.data,
    data: list.map(normalizeConversation),
  };
};

export const getChatMessages = async (
  peerUserId: string,
  page = 1,
  limit = 100,
): Promise<ChatResponse<ChatMessagesData>> => {
  const response = await api.get(`/chat/messages/${peerUserId}`, {
    params: { page, limit },
  });

  const normalized = toMessageData(response.data);
  return {
    ...response.data,
    data: normalized,
  };
};

export const sendChatMessage = async (
  payload: SendChatMessagePayload,
): Promise<ChatResponse<ChatSendMessageData>> => {
  const response = await api.post(
    "/chat/messages",
    JSON.stringify(payload),
    {
      headers: {
        "Content-Type": "application/json",
      },
      transformRequest: [(data) => data],
    },
  );

  return response.data;
};

export const markChatMessagesRead = async (
  payload: MarkChatMessagesReadPayload,
): Promise<ChatResponse<ChatMarkReadData>> => {
  const response = await api.patch(
    "/chat/messages/read",
    JSON.stringify(payload),
    {
      headers: {
        "Content-Type": "application/json",
      },
      transformRequest: [(data) => data],
    },
  );

  return response.data;
};

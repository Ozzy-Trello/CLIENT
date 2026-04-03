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

  return response.data;
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

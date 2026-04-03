import { api } from ".";
import {
  ChatConversation,
  ChatMessage,
  ChatMessageApiResponse,
  ChatMessagesApiResponse,
  ChatRoomMessageApiResponse,
  ChatRoomMessagesApiResponse,
  ChatMessagesQuery,
  ChatMessagesResponse,
  ChatPresenceStatus,
  ChatUser,
  ChatConversationsApiResponse,
  ChatUsersApiResponse,
  ReadChatMessagesPayload,
  SendChatTypingPayload,
  SendChatMessagePayload,
  SendChatRoomMessagePayload,
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

const resolveRoleName = (user: any): string | undefined => {
  const candidates = [
    user?.roleName,
    user?.role_name,
    user?.role?.name,
    user?.role,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const parseJsonIfPossible = (value: unknown): Record<string, any> | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {}

  return null;
};

const normalizePresenceStatus = (value: any): ChatPresenceStatus => {
  if (value === "online" || value === "idle" || value === "offline") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "online" : "offline";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "online" || normalized === "idle" || normalized === "offline") {
      return normalized;
    }
  }

  return "offline";
};

const normalizeChatUser = (user: any): ChatUser => ({
  id: resolveId(user?.id, user?.userId, user?.user_id, user?.peerUserId),
  name: resolveName(user),
  username: user?.username ?? user?.userName,
  roleName: resolveRoleName(user),
  email: user?.email,
  avatar: user?.avatar ?? user?.avatarUrl ?? user?.avatar_url,
  isOnline: user?.isOnline ?? user?.is_online,
  presenceStatus: normalizePresenceStatus(
    user?.presenceStatus ??
      user?.presence_status ??
      user?.status ??
      user?.presence ??
      user?.isOnline ??
      user?.is_online,
  ),
  unreadCount: user?.unreadCount ?? user?.unread_count ?? 0,
});

const normalizeStructuredMessageContent = (value: any): string => {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return String(value);
  }

  const text =
    typeof value?.text === "string"
      ? value.text
      : typeof value?.message === "string"
        ? value.message
        : "";

  const attachments = Array.isArray(value?.attachments)
    ? value.attachments
        .map((attachment: any) => {
          if (!attachment || typeof attachment !== "object") {
            return null;
          }
          const url =
            typeof attachment?.url === "string"
              ? attachment.url
              : typeof attachment?.href === "string"
                ? attachment.href
                : "";
          if (!url) {
            return null;
          }

          return {
            url,
            name:
              typeof attachment?.name === "string"
                ? attachment.name
                : typeof attachment?.filename === "string"
                  ? attachment.filename
                  : undefined,
            mimeType:
              typeof attachment?.mimeType === "string"
                ? attachment.mimeType
                : typeof attachment?.mime_type === "string"
                  ? attachment.mime_type
                  : typeof attachment?.type === "string"
                    ? attachment.type
                    : undefined,
            size:
              typeof attachment?.size === "number"
                ? attachment.size
                : undefined,
          };
        })
        .filter(Boolean)
    : [];

  const reply =
    value?.reply && typeof value.reply === "object"
      ? {
          messageId:
            typeof value.reply.messageId === "string"
              ? value.reply.messageId
              : typeof value.reply.message_id === "string"
                ? value.reply.message_id
                : undefined,
          author:
            typeof value.reply.author === "string"
              ? value.reply.author
              : undefined,
          text:
            typeof value.reply.text === "string"
              ? value.reply.text
              : typeof value.reply.message === "string"
                ? value.reply.message
                : undefined,
        }
      : value?.reply_to && typeof value.reply_to === "object"
        ? {
            messageId:
              typeof value.reply_to.message_id === "string"
                ? value.reply_to.message_id
                : undefined,
            text:
              typeof value.reply_to.message === "string"
                ? value.reply_to.message
                : undefined,
          }
        : undefined;

  if (!text && attachments.length === 0 && !reply) {
    return "";
  }

  return JSON.stringify({
    text,
    attachments,
    ...(reply ? { reply } : {}),
  });
};

const normalizeChatMessage = (message: any): ChatMessage => {
  const sender = message?.sender ? normalizeChatUser(message.sender) : undefined;
  const recipient = message?.recipient
    ? normalizeChatUser(message.recipient)
    : undefined;
  const rawContentValue =
    message?.content ?? message?.message ?? message?.text ?? message?.body ?? "";
  const parsedMessage = parseJsonIfPossible(rawContentValue);
  const parsedRoom = parsedMessage?.room;
  const roomId =
    (typeof parsedRoom?.id === "string" && parsedRoom.id) ||
    (typeof message?.roomId === "string" && message.roomId) ||
    (typeof message?.room_id === "string" && message.room_id) ||
    "";
  const roomName =
    (typeof parsedRoom?.name === "string" && parsedRoom.name) ||
    (typeof message?.roomName === "string" && message.roomName) ||
    (typeof message?.room_name === "string" && message.room_name) ||
    undefined;

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
    roomId: roomId || undefined,
    roomName,
    content: normalizeStructuredMessageContent(rawContentValue),
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
    conversation?.peerUser ??
      conversation?.peer ??
      conversation?.user ??
      conversation?.otherUser ??
      conversation?.contact ??
      {}
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
      conversation?.peer?.id,
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
  const { data } = await api.get<ChatUsersApiResponse>("/chat/users", {
    params: { limit: 500 },
  });
  return extractArray(data).map(normalizeChatUser);
};

export const getChatConversations = async (): Promise<ChatConversation[]> => {
  const { data } = await api.get<ChatConversationsApiResponse>(
    "/chat/conversations"
  );
  return extractArray(data).map(normalizeChatConversation);
};

export const getChatMessages = async (
  peerUserId: string,
  query: ChatMessagesQuery = {}
): Promise<ChatMessagesResponse> => {
  const params = new URLSearchParams();
  if (typeof query.page === "number") {
    params.set("page", String(query.page));
  }
  if (typeof query.limit === "number") {
    params.set("limit", String(query.limit));
  }

  const { data } = await api.get<ChatMessagesApiResponse>(
    `/chat/messages/${peerUserId}${params.toString() ? `?${params}` : ""}`
  );
  const payload = extractObject(data);
  const messages = extractArray(payload?.messages ?? payload).map(
    normalizeChatMessage
  );

  return {
    peerUser: payload?.peerUser ? normalizeChatUser(payload.peerUser) : undefined,
    peerUserId: resolveId(payload?.peerUserId, peerUserId),
    messages,
    paginate: payload?.paginate ?? data?.paginate,
  };
};

export const getGeneralRoomMessages = async (
  query: ChatMessagesQuery = {},
): Promise<ChatMessagesResponse> => {
  const params = new URLSearchParams();
  if (typeof query.page === "number") {
    params.set("page", String(query.page));
  }
  if (typeof query.limit === "number") {
    params.set("limit", String(query.limit));
  }

  const { data } = await api.get<ChatRoomMessagesApiResponse>(
    `/chat/rooms/general/messages${params.toString() ? `?${params}` : ""}`,
  );
  const payload = extractObject(data);
  const messages = extractArray(payload?.messages ?? payload).map(
    normalizeChatMessage,
  );

  return {
    messages: messages.map((item) => ({
      ...item,
      peerUserId: item.peerUserId || "general",
      roomId: item.roomId || "general",
      roomName: item.roomName || "General",
    })),
    paginate: payload?.paginate ?? data?.paginate,
  };
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
  const messagePayload =
    responsePayload?.id || responsePayload?.sender_id
      ? responsePayload
      : responsePayload?.message ?? responsePayload;
  const normalized = normalizeChatMessage(messagePayload);
  if (!normalized.peerUserId && payload.peerUserId) {
    normalized.peerUserId = payload.peerUserId;
  }
  return normalized;
};

export const sendGeneralRoomMessage = async (
  payload: SendChatRoomMessagePayload,
): Promise<ChatMessage> => {
  const { data } = await api.post<ChatRoomMessageApiResponse>(
    "/chat/rooms/general/messages",
    {
      message: payload.content,
    },
    {
      transformRequest: [(requestBody) => JSON.stringify(requestBody)],
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const responsePayload = extractObject(data);
  const messagePayload =
    responsePayload?.id || responsePayload?.sender_id
      ? responsePayload
      : responsePayload?.message ?? responsePayload;
  const normalized = normalizeChatMessage(messagePayload);
  return {
    ...normalized,
    peerUserId: payload.roomId || "general",
    roomId: normalized.roomId || payload.roomId || "general",
    roomName: normalized.roomName || "General",
  };
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

export const sendChatTyping = async (
  payload: SendChatTypingPayload
): Promise<void> => {
  await api.post(
    "/chat/typing",
    {
      peerUserId: payload.peerUserId,
      peer_user_id: payload.peerUserId,
      isTyping: payload.isTyping ?? true,
      typing: payload.isTyping ?? true,
    },
    {
      transformRequest: [(requestBody) => JSON.stringify(requestBody)],
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

export { normalizeChatConversation, normalizeChatMessage, normalizeChatUser };

import { ApiResponse, Pagination } from "./type";

export type ChatPresenceStatus = "online" | "idle" | "offline";

export interface ChatUser {
  id: string;
  name: string;
  username?: string;
  roleName?: string;
  email?: string;
  avatar?: string;
  isOnline?: boolean;
  presenceStatus?: ChatPresenceStatus;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  peerUserId: string;
  roomId?: string;
  roomName?: string;
  senderId: string;
  recipientId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  sender?: ChatUser;
  recipient?: ChatUser;
}

export interface ChatMessagesQuery {
  page?: number;
  limit?: number;
}

export interface ChatAttachmentMetadata {
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface ChatReplyPayload {
  messageId?: string;
  author: string;
  text: string;
}

export interface ChatMessagePayload {
  text?: string;
  attachments?: ChatAttachmentMetadata[];
  reply?: ChatReplyPayload;
}

export interface ChatConversation {
  id: string;
  peerUserId: string;
  peerUser: ChatUser;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  updatedAt?: string;
}

export interface SendChatMessagePayload {
  peerUserId: string;
  content: string;
}

export interface SendChatRoomMessagePayload {
  roomId: string;
  content: string;
}

export interface ReadChatMessagesPayload {
  peerUserId: string;
}

export interface SendChatTypingPayload {
  peerUserId?: string;
  roomId?: string;
  isTyping?: boolean;
}

export interface ChatMessagesResponse {
  peerUser?: ChatUser;
  peerUserId?: string;
  messages: ChatMessage[];
  paginate?: Pagination;
}

export type ChatUsersApiResponse = ApiResponse<ChatUser[]>;
export type ChatConversationsApiResponse = ApiResponse<ChatConversation[]>;
export type ChatMessagesApiResponse = ApiResponse<ChatMessage[] | ChatMessagesResponse>;
export type ChatMessageApiResponse = ApiResponse<
  ChatMessage | { message: ChatMessage; peerUser?: ChatUser; peerUserId?: string }
>;
export type ChatRoomMessagesApiResponse = ApiResponse<
  ChatMessage[] | ChatMessagesResponse
>;
export type ChatRoomMessageApiResponse = ApiResponse<ChatMessage | { message: ChatMessage }>;

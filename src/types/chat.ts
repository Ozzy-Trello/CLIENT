import { ApiResponse } from "./type";

export interface ChatUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar?: string;
  isOnline?: boolean;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  peerUserId: string;
  senderId: string;
  recipientId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  sender?: ChatUser;
  recipient?: ChatUser;
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

export interface ReadChatMessagesPayload {
  peerUserId: string;
}

export interface ChatMessagesResponse {
  peerUser?: ChatUser;
  peerUserId?: string;
  messages: ChatMessage[];
}

export type ChatUsersApiResponse = ApiResponse<ChatUser[]>;
export type ChatConversationsApiResponse = ApiResponse<ChatConversation[]>;
export type ChatMessagesApiResponse = ApiResponse<ChatMessage[] | ChatMessagesResponse>;
export type ChatMessageApiResponse = ApiResponse<
  ChatMessage | { message: ChatMessage; peerUser?: ChatUser; peerUserId?: string }
>;

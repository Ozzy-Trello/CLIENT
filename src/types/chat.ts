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

export interface ChatConversation {
  id: string;
  peerUserId: string;
  peerUser: ChatUser;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  updatedAt?: string;
}

export interface SendChatMessagePayload {
  peerUserId?: string;
  content?: string;
  recipientId?: string;
  message?: string;
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
export type ChatMessagesApiResponse = ApiResponse<
  ChatMessage[] | ChatMessagesResponse
>;
export type ChatMessageApiResponse = ApiResponse<
  ChatMessage | { message: ChatMessage; peerUser?: ChatUser; peerUserId?: string }
>;

// Legacy aliases for compatibility with existing hooks/components in this branch.
export interface ChatUserSummary {
  id: string;
  username: string;
  profilePicture: string | null;
}

export interface ChatConversationSummary {
  peerUser: ChatUserSummary;
  lastMessage: {
    id: string;
    senderId: string;
    recipientId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  unreadCount: number;
}

export interface ChatMessagesData {
  peerUser: ChatUserSummary;
  data: Array<{
    id: string;
    senderId: string;
    recipientId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ChatSendMessageData {
  message: {
    id: string;
    senderId: string;
    recipientId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
  };
  peerUser: ChatUserSummary;
}

export interface ChatMarkReadData {
  updatedCount: number;
}

export interface ChatPaginate {
  totalData?: number;
  totalPage?: number;
  currentPage?: number;
  perPage?: number;
}

export interface ChatResponse<T> {
  message?: string;
  data: T;
}

export interface ChatListResponse<T> extends ChatResponse<T> {
  paginate?: ChatPaginate;
}

export interface MarkChatMessagesReadPayload {
  peerUserId: string;
}

export interface ChatNewMessageEventPayload {
  message: {
    id: string;
    senderId: string;
    recipientId: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    updatedAt: string;
  };
  peerUser: ChatUserSummary;
  senderUser: ChatUserSummary;
  recipientUser: ChatUserSummary;
}

export interface ChatUserSummary {
  id: string;
  username: string;
  profilePicture: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationSummary {
  peerUser: ChatUserSummary;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface ChatMessagesData {
  peerUser: ChatUserSummary;
  data: ChatMessage[];
}

export interface ChatSendMessageData {
  message: ChatMessage;
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
  message: string;
  data: T;
}

export interface ChatListResponse<T> extends ChatResponse<T> {
  paginate?: ChatPaginate;
}

export interface SendChatMessagePayload {
  recipientId: string;
  message: string;
}

export interface MarkChatMessagesReadPayload {
  peerUserId: string;
}

export interface ChatNewMessageEventPayload {
  message: ChatMessage;
  peerUser: ChatUserSummary;
  senderUser: ChatUserSummary;
  recipientUser: ChatUserSummary;
}

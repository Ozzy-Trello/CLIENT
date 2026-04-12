"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import camelcaseKeys from "camelcase-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Image,
  Input,
  List,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import {
  CloseOutlined,
  DownOutlined,
  LinkOutlined,
  TeamOutlined,
  MessageOutlined,
  MinusOutlined,
  PaperClipOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import styles from "./chat-widget.module.css";
import { useWebSocket } from "@hooks/websocket";
import { selectUser } from "@store/app_slice";
import { queryKeys } from "@constants/query-keys";
import {
  getChatConversations,
  getChatMessages,
  getGeneralRoomMessages,
  getChatUsers,
  addReaction as addReactionApi,
  markChatMessagesRead,
  normalizeChatMessage,
  normalizeChatUser,
  removeReaction as removeReactionApi,
  sendChatTyping,
  sendChatMessage,
  sendGeneralRoomMessage,
} from "@api/chat";
import { uploadFile } from "@api/file";
import type {
  ChatAttachmentMetadata,
  ChatConversation,
  ChatMessage,
  ChatMessagePayload,
  ChatReplyPayload,
  ChatUser,
} from "@myTypes/chat";
import type { Pagination } from "@myTypes/type";
import AttachmentPreviewModal from "@components/attachment-preview-modal";
import {
  CardAttachment,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import type { ChatPresenceStatus } from "@myTypes/chat";
import { isImageFile, isPDFFile, isVideoFile } from "@utils/file";
import { buildFileProxyUrl } from "@utils/file-url";

const { Text } = Typography;

const MAX_OPEN_WINDOWS = 3;
const MAX_VISIBLE_MINIMIZED = 3;
const CHAT_WINDOWS_STORAGE_PREFIX = "chat_widget_windows_v1";
const GENERAL_SEEN_STORAGE_PREFIX = "chat_widget_general_seen_v1";

type ChatWindowState = {
  peerUserId: string;
  minimized: boolean;
  openedAt: number;
};

type PeerEntry = {
  peerUserId: string;
  peerUser: ChatUser;
  unreadCount: number;
  lastMessage?: string;
  updatedAt?: string;
};

type ReplyDraft = {
  messageId: string;
  senderId?: string;
  author: string;
  text: string;
};

type ParsedReply = {
  author: string;
  quotedText: string;
  body: string;
};

type ParsedChatMessage = {
  text: string;
  attachments: ChatAttachmentMetadata[];
  reply?: ChatReplyPayload;
};

type PresenceUpdate = {
  userId: string;
  status: ChatPresenceStatus;
};

type ChatMessagePage = {
  messages: ChatMessage[];
  paginate?: Pagination;
};

type ScrollRestore = {
  scrollTop: number;
  scrollHeight: number;
};

type LoadMessagesResult = {
  nextPage: number;
  hasMore: boolean;
};

const CHAT_MESSAGE_PAGE_SIZE = 20;
const CHAT_TYPING_IDLE_MS = 2400;
const CHAT_TYPING_THROTTLE_MS = 1200;
const CHAT_PRESENCE_TIMEOUT_MS = 2500;
const CHAT_GENERAL_POLL_CONNECTED_MS = 20_000;
const CHAT_GENERAL_POLL_DISCONNECTED_MS = 8_000;
const CHAT_REPLY_JUMP_MAX_PAGE_LOADS = 20;
const CHAT_SCROLL_TO_LATEST_THRESHOLD = 120;
const REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
  "🔥",
  "✅",
  "👏",
  "💯",
  "🎉",
  "🙌",
  "🤝",
  "👌",
  "🤔",
  "😅",
  "😭",
  "😡",
  "🤯",
  "🥳",
  "😍",
  "🤩",
  "😎",
  "💪",
  "🚀",
  "⭐",
  "📌",
  "🫡",
  "🤗",
  "😴",
] as const;
const GENERAL_ROOM_ID = "general";
const GENERAL_ROOM_NAME = "General";
const GENERAL_ROOM_ROLE = "Group chat";
const GENERAL_MENTION_ALL_ID = "__mention_all__";
const GENERAL_MENTION_ALL_LABEL = "All";
const GENERAL_MENTION_ALL_ROLE = "Mention everyone";
const GENERAL_ROOM_POLLING_QUERY_KEY = [
  ...queryKeys.chat.roomMessages(GENERAL_ROOM_ID),
  "polling",
] as const;

const isGeneralRoom = (peerUserId: string) => peerUserId === GENERAL_ROOM_ID;

const formatTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toReplySnippet = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, 80);

const parseReplyContent = (value: string): ParsedReply | null => {
  const normalized = value.startsWith("↪ ")
    ? `Reply to ${value.slice(2).trimStart()}`
    : value;

  if (!normalized.startsWith("Reply to ")) {
    return null;
  }

  const lineBreakIndex = normalized.indexOf("\n");
  if (lineBreakIndex === -1) {
    return null;
  }

  const header = normalized.slice("Reply to ".length, lineBreakIndex);
  const separatorIndex = header.indexOf(": ");
  if (separatorIndex === -1) {
    return null;
  }

  const author = header.slice(0, separatorIndex).trim();
  const quotedText = header.slice(separatorIndex + 2).trim();
  const body = normalized.slice(lineBreakIndex + 1).trim();

  if (!author || !quotedText || !body) {
    return null;
  }

  return {
    author,
    quotedText,
    body,
  };
};

const normalizeChatAttachment = (value: any): ChatAttachmentMetadata | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const url =
    typeof value.url === "string"
      ? value.url
      : typeof value.href === "string"
        ? value.href
        : "";
  const name =
    typeof value.name === "string"
      ? value.name
      : typeof value.fileName === "string"
        ? value.fileName
        : typeof value.filename === "string"
          ? value.filename
          : "";

  if (!url || !name) {
    return null;
  }

  return {
    url,
    name,
    mimeType:
      typeof value.mimeType === "string"
        ? value.mimeType
        : typeof value.type === "string"
          ? value.type
          : undefined,
    size:
      typeof value.size === "number"
        ? value.size
        : typeof value.fileSize === "number"
          ? value.fileSize
          : undefined,
  };
};

const parseMessagePayload = (value = ""): ParsedChatMessage => {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as any;
      const attachmentsSource: unknown[] = Array.isArray(parsed.attachments)
        ? (parsed.attachments as unknown[])
        : Array.isArray(parsed.attachment)
          ? (parsed.attachment as unknown[])
          : [];
      const attachments = attachmentsSource
        .map((item: unknown) => normalizeChatAttachment(item))
        .filter((item): item is ChatAttachmentMetadata => Boolean(item));
      const rawReply =
        parsed.reply ||
        parsed.reply_to ||
        parsed.replyTo ||
        null;
      const reply =
        rawReply &&
        typeof rawReply === "object"
          ? {
              author:
                typeof rawReply.author === "string" && rawReply.author.trim()
                  ? rawReply.author
                  : typeof rawReply.username === "string" && rawReply.username.trim()
                    ? rawReply.username
                    : typeof rawReply.name === "string" && rawReply.name.trim()
                      ? rawReply.name
                      : typeof rawReply.senderName === "string" &&
                          rawReply.senderName.trim()
                        ? rawReply.senderName
                        : typeof rawReply.sender_name === "string" &&
                            rawReply.sender_name.trim()
                          ? rawReply.sender_name
                  : "Reply",
              text:
                typeof rawReply.text === "string"
                  ? rawReply.text
                  : typeof rawReply.message === "string"
                    ? rawReply.message
                    : typeof rawReply.content === "string"
                      ? rawReply.content
                      : "",
              messageId:
                typeof rawReply.messageId === "string"
                  ? rawReply.messageId
                  : typeof rawReply.message_id === "string"
                    ? rawReply.message_id
                    : undefined,
              senderId:
                typeof rawReply.senderId === "string"
                  ? rawReply.senderId
                  : typeof rawReply.sender_id === "string"
                    ? rawReply.sender_id
                    : undefined,
              recipientId:
                typeof rawReply.recipientId === "string"
                  ? rawReply.recipientId
                  : typeof rawReply.recipient_id === "string"
                    ? rawReply.recipient_id
                  : undefined,
            }
          : undefined;
      const normalizedReply =
        reply &&
        (reply.text ||
          reply.messageId ||
          reply.senderId ||
          reply.recipientId)
          ? reply
          : undefined;
      const text = typeof parsed.text === "string" ? parsed.text : "";
      const legacyReplyInText =
        !normalizedReply && text ? parseReplyContent(text) : null;

      if (legacyReplyInText) {
        return {
          text: legacyReplyInText.body,
          attachments,
          reply: {
            author: legacyReplyInText.author,
            text: legacyReplyInText.quotedText,
          },
        };
      }

      if (text || attachments.length > 0 || normalizedReply) {
        return { text, attachments, reply: normalizedReply };
      }
    } catch {}
  }

  const parsedReply = parseReplyContent(value);
  if (parsedReply) {
    return {
      text: parsedReply.body,
      attachments: [],
      reply: {
        author: parsedReply.author,
        text: parsedReply.quotedText,
      },
    };
  }

  return {
    text: value,
    attachments: [],
  };
};

const buildMessagePayload = (payload: ChatMessagePayload) => {
  if (!payload.reply) {
    return JSON.stringify(payload);
  }

  const normalizedReply = {
    ...(payload.reply.messageId ? { messageId: payload.reply.messageId } : {}),
    ...(payload.reply.senderId ? { senderId: payload.reply.senderId } : {}),
    ...(payload.reply.recipientId ? { recipientId: payload.reply.recipientId } : {}),
    ...(payload.reply.author ? { author: payload.reply.author } : {}),
    ...(payload.reply.text ? { text: payload.reply.text, message: payload.reply.text } : {}),
  };

  return JSON.stringify({
    ...payload,
    reply: normalizedReply,
    replyTo: normalizedReply,
    reply_to: {
      ...(payload.reply.messageId ? { message_id: payload.reply.messageId } : {}),
      ...(payload.reply.senderId ? { sender_id: payload.reply.senderId } : {}),
      ...(payload.reply.recipientId ? { recipient_id: payload.reply.recipientId } : {}),
      ...(payload.reply.author ? { author: payload.reply.author } : {}),
      ...(payload.reply.text ? { text: payload.reply.text, message: payload.reply.text } : {}),
    },
  });
};

const IMAGE_EXTENSION_REGEX =
  /\.(avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|tiff?|webp)$/i;

const isImageAttachment = (attachment: ChatAttachmentMetadata) =>
  Boolean(
    attachment.mimeType?.startsWith("image/") ||
      IMAGE_EXTENSION_REGEX.test(attachment.name || attachment.url),
  );

const formatAttachmentSize = (size?: number) => {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isFileDragEvent = (event: DragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer?.types || []).includes("Files");

const isPreviewableAttachment = (attachment: ChatAttachmentMetadata) =>
  isImageFile(attachment.name || "", attachment.mimeType) ||
  isPDFFile(attachment.name || "", attachment.mimeType) ||
  isVideoFile(attachment.name || "", attachment.mimeType);

const toPreviewAttachment = (
  attachment: ChatAttachmentMetadata,
  messageId: string,
  index: number,
  currentUserId?: string,
): CardAttachment => ({
  id: `chat-attachment-${messageId}-${index}`,
  isCover: false,
  cardId: `chat-${messageId}`,
  attachableType: EnumAttachmentType.File,
  attachableId: `chat-file-${messageId}-${index}`,
  type: EnumCardAttachmentType.Attachment,
  file: {
    id: `chat-file-${messageId}-${index}`,
    name: attachment.name || `Attachment ${index + 1}`,
    url: attachment.url,
    size: attachment.size ?? 0,
    sizeUnit: "B",
    mimeType: attachment.mimeType || "",
    createdBy: currentUserId || "",
    createdAt: new Date().toISOString(),
  },
});

const summarizeMessageContent = (value = "") => {
  const parsed = parseMessagePayload(value);

  if (parsed.text.trim()) {
    return parsed.text.trim();
  }

  if (parsed.attachments.length === 1) {
    return `Attachment: ${parsed.attachments[0].name}`;
  }

  if (parsed.attachments.length > 1) {
    return `${parsed.attachments.length} attachments`;
  }

  return "";
};

const summarizeChatToastContent = (value = "") => {
  const parsed = parseMessagePayload(value);

  if (parsed.text.trim()) {
    return parsed.text.trim();
  }

  if (parsed.attachments.length > 0) {
    return "(Attachment)";
  }

  return "";
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
    if (
      normalized === "online" ||
      normalized === "idle" ||
      normalized === "offline"
    ) {
      return normalized;
    }
  }

  return "offline";
};

const resolvePresenceUserId = (value: any): string => {
  const candidates = [
    value?.userId,
    value?.senderUserId,
    value?.recipientUserId,
    value?.user_id,
    value?.sender_user_id,
    value?.recipient_user_id,
    value?.id,
    value?.readerUserId,
    value?.reader_user_id,
    value?.peerUserId,
    value?.peer_user_id,
    value?.user?.id,
    value?.user?.userId,
    value?.user?.user_id,
    value?.reader?.id,
    value?.reader?.userId,
    value?.reader?.user_id,
    value?.peerUser?.id,
    value?.peer_user?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const resolveChatPeerUserId = (value: any, currentUserId?: string) => {
  const directPeerId = resolvePresenceUserId(value);
  if (directPeerId && directPeerId !== currentUserId) {
    return directPeerId;
  }

  const senderId =
    value?.senderId || value?.sender_id || value?.senderUserId || value?.sender_user_id;
  const recipientId =
    value?.recipientId ||
    value?.recipient_id ||
    value?.recipientUserId ||
    value?.recipient_user_id;

  if (currentUserId && senderId === currentUserId) {
    return (
      recipientId ||
      value?.peerUserId ||
      value?.peer_user_id ||
      ""
    );
  }

  if (currentUserId && recipientId === currentUserId) {
    return (
      senderId ||
      value?.peerUserId ||
      value?.peer_user_id ||
      ""
    );
  }

  return (
    value?.peerUserId ||
    value?.peer_user_id ||
    value?.conversationPeerId ||
    value?.conversation_peer_id ||
    recipientId ||
    senderId ||
    ""
  );
};

const resolveTypingPayloadData = (value: any) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const nestedDataCandidates = [
    value.data,
    value.payload,
    value.eventData,
    value.event_data,
  ];

  for (const candidate of nestedDataCandidates) {
    if (candidate && typeof candidate === "object") {
      return candidate;
    }
  }

  return value;
};

const extractPresenceUpdates = (value: any): PresenceUpdate[] => {
  const entries = Array.isArray(value)
    ? value
    : Array.isArray(value?.users)
      ? value.users
      : Array.isArray(value?.presences)
        ? value.presences
        : Array.isArray(value?.data)
          ? value.data
          : Array.isArray(value?.payload)
            ? value.payload
            : value && typeof value === "object" &&
                (value.userId ||
                  value.user_id ||
                  value.id ||
                  value.peerUserId ||
                  value.peer_user_id ||
                  value.users ||
                  value.presences)
              ? [value]
              : [];

  return entries
    .flatMap((entry: any) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        if (entry.users && typeof entry.users === "object" && !Array.isArray(entry.users)) {
          return Object.entries(entry.users).map(([userId, userValue]) => ({
            userId,
            status: normalizePresenceStatus(
              (userValue as any)?.status ??
                (userValue as any)?.presenceStatus ??
                (userValue as any)?.presence_status ??
                (userValue as any)?.user?.status ??
                (userValue as any)?.user?.presenceStatus ??
                (userValue as any)?.user?.presence_status ??
                (userValue as any)?.isOnline ??
                (userValue as any)?.is_online ??
                (userValue as any)?.user?.isOnline ??
                (userValue as any)?.user?.is_online,
            ),
          }));
        }

        if (
          entry.presences &&
          typeof entry.presences === "object" &&
          !Array.isArray(entry.presences)
        ) {
          return Object.entries(entry.presences).map(([userId, userValue]) => ({
            userId,
            status: normalizePresenceStatus(
              (userValue as any)?.status ??
                (userValue as any)?.presenceStatus ??
                (userValue as any)?.presence_status ??
                (userValue as any)?.user?.status ??
                (userValue as any)?.user?.presenceStatus ??
                (userValue as any)?.user?.presence_status ??
                (userValue as any)?.isOnline ??
                (userValue as any)?.is_online ??
                (userValue as any)?.user?.isOnline ??
                (userValue as any)?.user?.is_online,
            ),
          }));
        }
      }

      const userId = resolvePresenceUserId(entry);
      if (!userId) {
        return [];
      }

      return [
        {
          userId,
          status: normalizePresenceStatus(
            entry?.status ??
              entry?.presenceStatus ??
              entry?.presence_status ??
              entry?.user?.status ??
              entry?.user?.presenceStatus ??
              entry?.user?.presence_status ??
              entry?.isOnline ??
              entry?.is_online ??
              entry?.user?.isOnline ??
              entry?.user?.is_online,
          ),
        },
      ];
    })
    .filter((entry: PresenceUpdate) => Boolean(entry.userId));
};

const URL_TOKEN_REGEX = /(https?:\/\/[^\s<>"']+)/g;
const URL_STRICT_REGEX = /^https?:\/\/[^\s<>"']+$/i;
const MENTION_QUERY_REGEX = /(?:^|\s)@([a-zA-Z0-9._-]{0,64})$/;
const MENTION_TOKEN_REGEX = /(^|\s)(@[a-zA-Z0-9._-]+)/g;
const MENTION_CAPTURE_REGEX = /(?:^|\s)@([a-zA-Z0-9._-]{1,64})/g;
const MENTION_ALL_TOKEN = "all";

const normalizeMentionHandle = (value = "") =>
  value.trim().replace(/\s+/g, "");

const getMentionHandle = (user?: ChatUser | null) =>
  normalizeMentionHandle(user?.username || user?.name || "");

const extractMentionTokens = (value = "") => {
  const handles: string[] = [];
  let match: RegExpExecArray | null = null;
  MENTION_CAPTURE_REGEX.lastIndex = 0;
  while ((match = MENTION_CAPTURE_REGEX.exec(value)) !== null) {
    const token = normalizeMentionHandle(match[1] || "").toLowerCase();
    if (token) {
      handles.push(token);
    }
  }
  return handles;
};

const getCurrentMentionAliases = (currentUser?: { username?: string; name?: string } | null) => {
  const aliases = new Set<string>();
  const username = normalizeMentionHandle(currentUser?.username || "").toLowerCase();
  const name = normalizeMentionHandle(currentUser?.name || "").toLowerCase();
  if (username) {
    aliases.add(username);
  }
  if (name) {
    aliases.add(name);
  }
  return aliases;
};

const messageMentionsCurrentUser = (
  message: ChatMessage,
  currentUser?: { id?: string; username?: string; name?: string } | null,
) => {
  const parsed = parseMessagePayload(message.content || "");
  if (parsed.reply?.senderId && currentUser?.id && parsed.reply.senderId === currentUser.id) {
    return true;
  }

  const tokens = extractMentionTokens(parsed.text || "");
  if (tokens.includes(MENTION_ALL_TOKEN)) {
    return true;
  }

  const aliases = getCurrentMentionAliases(currentUser);
  if (aliases.size === 0) {
    return false;
  }

  return tokens.some((token) => aliases.has(token));
};

const getMessageIdentitySeed = (message: ChatMessage) => {
  const isGeneralMessage =
    message?.roomId === GENERAL_ROOM_ID || message?.peerUserId === GENERAL_ROOM_ID;
  const parsed = parseMessagePayload(message.content || "");
  const text = parsed.text || "";
  const attachmentFingerprint = parsed.attachments
    .map((attachment) => attachment.url || attachment.name || "")
    .join(",");

  return [
    message.senderId || "",
    isGeneralMessage ? "" : message.recipientId || "",
    message.createdAt || "",
    text,
    attachmentFingerprint,
  ].join("|");
};

const isGeneralSemanticDuplicate = (left: ChatMessage, right: ChatMessage) => {
  const leftIsGeneral =
    left?.roomId === GENERAL_ROOM_ID || left?.peerUserId === GENERAL_ROOM_ID;
  const rightIsGeneral =
    right?.roomId === GENERAL_ROOM_ID || right?.peerUserId === GENERAL_ROOM_ID;

  if (!leftIsGeneral || !rightIsGeneral) {
    return false;
  }

  if (!left.senderId || !right.senderId || left.senderId !== right.senderId) {
    return false;
  }

  if (!left.createdAt || !right.createdAt || left.createdAt !== right.createdAt) {
    return false;
  }

  const leftParsed = parseMessagePayload(left.content || "");
  const rightParsed = parseMessagePayload(right.content || "");
  const leftAttachmentFingerprint = leftParsed.attachments
    .map((attachment) => attachment.url || attachment.name || "")
    .join(",");
  const rightAttachmentFingerprint = rightParsed.attachments
    .map((attachment) => attachment.url || attachment.name || "")
    .join(",");
  const leftReplyFingerprint = leftParsed.reply
    ? [
        leftParsed.reply.messageId || "",
        leftParsed.reply.senderId || "",
        leftParsed.reply.recipientId || "",
        leftParsed.reply.author || "",
        leftParsed.reply.text || "",
      ].join("|")
    : "";
  const rightReplyFingerprint = rightParsed.reply
    ? [
        rightParsed.reply.messageId || "",
        rightParsed.reply.senderId || "",
        rightParsed.reply.recipientId || "",
        rightParsed.reply.author || "",
        rightParsed.reply.text || "",
      ].join("|")
    : "";

  return (
    (leftParsed.text || "") === (rightParsed.text || "") &&
    leftAttachmentFingerprint === rightAttachmentFingerprint &&
    leftReplyFingerprint === rightReplyFingerprint
  );
};

const getIncomingMessageKey = (peerUserId: string, message: ChatMessage) => {
  const stableId = message.id || getMessageIdentitySeed(message);
  return `${peerUserId}:${stableId}`;
};

const extractMentionQuery = (value: string): string | null => {
  const match = value.match(MENTION_QUERY_REGEX);
  return match ? match[1] || "" : null;
};

const applyMentionSelection = (value: string, username: string) =>
  value.replace(MENTION_QUERY_REGEX, (fullMatch, mentionPart) => {
    const hasLeadingSpace = fullMatch.startsWith(" ");
    const prefix = hasLeadingSpace ? " " : "";
    const existing = typeof mentionPart === "string" ? mentionPart : "";
    const suffix =
      fullMatch.endsWith(" ") && existing === "" ? "" : " ";
    return `${prefix}@${username}${suffix}`;
  });

const renderTextWithMentions = (value: string, keyPrefix: string) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null = null;
  MENTION_TOKEN_REGEX.lastIndex = 0;

  while ((match = MENTION_TOKEN_REGEX.exec(value)) !== null) {
    const start = match.index;
    const fullMatch = match[0];
    const leading = match[1] || "";
    const mentionToken = match[2] || "";

    if (start > lastIndex) {
      parts.push(
        <span key={`${keyPrefix}-txt-${matchIndex}`}>
          {value.slice(lastIndex, start)}
        </span>,
      );
    }

    parts.push(
      <span key={`${keyPrefix}-lead-${matchIndex}`}>{leading}</span>,
      <span key={`${keyPrefix}-mention-${matchIndex}`} className={styles.mentionToken}>
        {mentionToken}
      </span>,
    );

    lastIndex = start + fullMatch.length;
    matchIndex += 1;
  }

  if (lastIndex < value.length) {
    parts.push(
      <span key={`${keyPrefix}-tail`}>{value.slice(lastIndex)}</span>,
    );
  }

  return parts.length > 0 ? parts : value;
};

const renderMessageContent = (value = "") => {
  const lines = value.split("\n");

  return lines.map((line, lineIndex) => (
    <span key={`line-${lineIndex}`}>
      {line.split(URL_TOKEN_REGEX).map((token, tokenIndex) =>
        URL_STRICT_REGEX.test(token) ? (
          <a
            key={`token-${lineIndex}-${tokenIndex}`}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.messageLink}
          >
            {token}
          </a>
        ) : (
          <span key={`token-${lineIndex}-${tokenIndex}`}>
            {renderTextWithMentions(token, `token-${lineIndex}-${tokenIndex}`)}
          </span>
        ),
      )}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </span>
  ));
};

const sortByLatest = (left: ChatConversation, right: ChatConversation) => {
  const leftTime = left.updatedAt || left.lastMessage?.createdAt || "";
  const rightTime = right.updatedAt || right.lastMessage?.createdAt || "";
  return rightTime.localeCompare(leftTime);
};

const getRoleLabel = (user?: ChatUser | null) =>
  user?.roleName || "";

const TypingIndicator = ({ label = "Someone is typing..." }: { label?: string | null }) => (
  <span className={styles.typingIndicator} aria-label="typing">
    {label ? (
      <span className={styles.typingLabel}>{label}</span>
    ) : null}
    <span className={styles.typingDotsWrap}>
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
    </span>
  </span>
);

const hasReplyInContent = (content?: string) =>
  Boolean(parseMessagePayload(content || "").reply);

const pickRicherContent = (incoming?: string, existing?: string) => {
  const incomingValue = incoming || "";
  const existingValue = existing || "";

  if (!incomingValue) {
    return existingValue;
  }

  if (hasReplyInContent(existingValue) && !hasReplyInContent(incomingValue)) {
    return existingValue;
  }

  return incomingValue;
};

const getMessageMergeKey = (message: ChatMessage) => {
  if (message?.id) {
    return `id:${message.id}`;
  }

  return [
    "fallback",
    getMessageIdentitySeed(message),
  ].join("|");
};

const mergeMessages = (current: ChatMessage[] = [], next: ChatMessage) => {
  const map = new Map<string, ChatMessage>();

  for (const item of current) {
    map.set(getMessageMergeKey(item), item);
  }

  const semanticDuplicateEntry = Array.from(map.entries()).find(([, existing]) =>
    isGeneralSemanticDuplicate(existing, next),
  );

  if (semanticDuplicateEntry) {
    const [semanticDuplicateKey, existing] = semanticDuplicateEntry;
    map.set(semanticDuplicateKey, {
      ...existing,
      ...next,
      content: pickRicherContent(next.content, existing.content),
    });
    return Array.from(map.values()).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  const nextKey = getMessageMergeKey(next);
  const existing = map.get(nextKey);
  if (existing) {
    map.set(nextKey, {
      ...existing,
      ...next,
      content: pickRicherContent(next.content, existing.content),
    });
  } else {
    map.set(nextKey, next);
  }

  return Array.from(map.values()).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
};

const mergeMessageLists = (
  current: ChatMessage[] = [],
  next: ChatMessage[] = [],
) => next.reduce((list, message) => mergeMessages(list, message), current);

const resolvePeerUserId = (
  messageData: ChatMessage,
  currentUserId?: string,
  rawData?: any,
) => {
  const directPeerId =
    messageData.peerUserId ||
    rawData?.peerUserId ||
    rawData?.peer_user_id ||
    rawData?.peerUser?.id ||
    rawData?.peer_user?.id ||
    rawData?.conversationPeerId ||
    rawData?.conversation_peer_id ||
    rawData?.sender?.id ||
    rawData?.senderId ||
    rawData?.sender_id ||
    rawData?.fromUser?.id ||
    rawData?.fromUserId ||
    rawData?.from_user_id ||
    rawData?.recipient?.id ||
    rawData?.recipientId ||
    rawData?.recipient_id ||
    rawData?.toUser?.id ||
    rawData?.toUserId ||
    rawData?.to_user_id ||
    rawData?.message?.peerUserId ||
    rawData?.message?.peer_user_id ||
    rawData?.message?.senderId ||
    rawData?.message?.sender_id ||
    rawData?.message?.recipientId ||
    rawData?.message?.recipient_id;

  if (directPeerId) {
    return directPeerId;
  }

  if (currentUserId && messageData.senderId === currentUserId) {
    return (
      messageData.recipientId ||
      rawData?.recipientId ||
      rawData?.recipient_id ||
      rawData?.toUserId ||
      rawData?.to_user_id ||
      ""
    );
  }

  if (currentUserId && messageData.recipientId === currentUserId) {
    return (
      messageData.senderId ||
      rawData?.senderId ||
      rawData?.sender_id ||
      rawData?.fromUserId ||
      rawData?.from_user_id ||
      ""
    );
  }

  return (
    messageData.senderId ||
    messageData.recipientId ||
    rawData?.senderId ||
    rawData?.recipientId ||
    ""
  );
};

const resolvePeerUser = (
  messageData: ChatMessage,
  rawData: any,
  currentUserId?: string,
) => {
  if (currentUserId && messageData.senderId === currentUserId) {
    return normalizeChatUser(
      rawData?.recipient ?? rawData?.toUser ?? rawData?.peerUser ?? {},
    );
  }

  if (currentUserId && messageData.recipientId === currentUserId) {
    return normalizeChatUser(
      rawData?.sender ?? rawData?.fromUser ?? rawData?.peerUser ?? {},
    );
  }

  return normalizeChatUser(
    rawData?.peerUser ??
      rawData?.sender ??
      rawData?.recipient ??
      rawData?.user ??
      {},
  );
};

const upsertConversation = (
  current: ChatConversation[] | undefined,
  next: ChatConversation,
) => {
  const list = current ? [...current] : [];
  const index = list.findIndex((item) => item.peerUserId === next.peerUserId);

  if (index >= 0) {
    list[index] = next;
  } else {
    list.unshift(next);
  }

  return list.sort(sortByLatest);
};

const upsertUnreadCount = (
  current: ChatConversation[] | undefined,
  peerUserId: string,
  unreadCount: number,
) => {
  const list = current ? [...current] : [];
  const index = list.findIndex((item) => item.peerUserId === peerUserId);

  if (index >= 0) {
    list[index] = {
      ...list[index],
      unreadCount,
    };
  }

  return list;
};

const updateConversationForMessage = (
  current: ChatConversation[] | undefined,
  peerUserId: string,
  peerUser: ChatUser,
  messageData: ChatMessage,
  isOwnMessage: boolean,
  isOpenAndActive: boolean,
) => {
  const list = current ? [...current] : [];
  const index = list.findIndex((item) => item.peerUserId === peerUserId);
  const existing = index >= 0 ? list[index] : undefined;

  const nextConversation: ChatConversation = {
    id: existing?.id || peerUserId,
    peerUserId,
    peerUser: existing?.peerUser?.id ? existing.peerUser : peerUser,
    lastMessage: messageData,
    unreadCount: isOwnMessage
      ? existing?.unreadCount || 0
      : isOpenAndActive
        ? 0
        : (existing?.unreadCount || 0) + 1,
    updatedAt: messageData.createdAt,
  };

  return upsertConversation(list, nextConversation);
};

const upsertWindow = (
  windows: ChatWindowState[],
  peerUserId: string,
  nextState: Partial<ChatWindowState>,
) => {
  const now = Date.now();
  const next = [...windows];
  const index = next.findIndex((item) => item.peerUserId === peerUserId);

  if (index >= 0) {
    next[index] = {
      ...next[index],
      ...nextState,
      openedAt: nextState.openedAt ?? now,
    };
    return next;
  }

  next.push({
    peerUserId,
    minimized: Boolean(nextState.minimized),
    openedAt: nextState.openedAt ?? now,
  });
  return next;
};

const enforceWindowLimit = (windows: ChatWindowState[]) => {
  const expanded = windows.filter((window) => !window.minimized);
  if (expanded.length <= MAX_OPEN_WINDOWS) {
    return windows;
  }

  const needMinimized = expanded.length - MAX_OPEN_WINDOWS;
  const oldestExpanded = [...expanded]
    .sort((left, right) => left.openedAt - right.openedAt)
    .slice(0, needMinimized)
    .map((window) => window.peerUserId);
  const ids = new Set(oldestExpanded);

  return windows.map((window) =>
    ids.has(window.peerUserId) ? { ...window, minimized: true } : window,
  );
};

const ChatWidget = () => {
  const currentUser = useSelector(selectUser);
  const currentUserId = currentUser?.id;
  const queryClient = useQueryClient();
  const { socket, isConnected, connectionAttempts } = useWebSocket();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatWindows, setChatWindows] = useState<ChatWindowState[]>([]);
  const [didRestoreWindows, setDidRestoreWindows] = useState(false);
  const [draftByPeerId, setDraftByPeerId] = useState<Record<string, string>>(
    {},
  );
  const [replyByPeerId, setReplyByPeerId] = useState<
    Record<string, ReplyDraft | undefined>
  >({});
  const [pendingFilesByPeerId, setPendingFilesByPeerId] = useState<
    Record<string, File[]>
  >({});
  const [sendingByPeerId, setSendingByPeerId] = useState<Record<string, boolean>>(
    {},
  );
  const [isDragOverByPeerId, setIsDragOverByPeerId] = useState<
    Record<string, boolean>
  >({});
  const [messagesByPeerId, setMessagesByPeerId] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [messagesPaginationByPeerId, setMessagesPaginationByPeerId] = useState<
    Record<string, Pagination | undefined>
  >({});
  const [hasMoreMessagesByPeerId, setHasMoreMessagesByPeerId] = useState<
    Record<string, boolean>
  >({});
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<string, ChatPresenceStatus>
  >({});
  const [typingByUserId, setTypingByUserId] = useState<Record<string, boolean>>(
    {},
  );
  const [incomingAnimatedByMessageId, setIncomingAnimatedByMessageId] = useState<
    Record<string, boolean>
  >({});
  const [jumpHighlightedByMessageId, setJumpHighlightedByMessageId] = useState<
    Record<string, boolean>
  >({});
  const [roomUnreadById, setRoomUnreadById] = useState<Record<string, number>>({});
  const [roomMentionById, setRoomMentionById] = useState<Record<string, boolean>>({});
  const [generalLastActivity, setGeneralLastActivity] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    string | null
  >(null);
  const [composerEmojiPickerPeerId, setComposerEmojiPickerPeerId] = useState<
    string | null
  >(null);
  const [reactionPickerExpanded, setReactionPickerExpanded] = useState(false);

  useEffect(() => {
    const handleOutsideEmojiPickers = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const insideReactionPicker = target.closest("[data-reaction-picker='true']");
      const insideComposerPicker = target.closest("[data-composer-picker='true']");
      const onReactionTrigger = target.closest("[data-reaction-trigger='true']");
      const onComposerTrigger = target.closest("[data-composer-trigger='true']");

      if (
        insideReactionPicker ||
        insideComposerPicker ||
        onReactionTrigger ||
        onComposerTrigger
      ) {
        return;
      }

      setReactionPickerMessageId(null);
      setReactionPickerExpanded(false);
      setComposerEmojiPickerPeerId(null);
    };

    document.addEventListener("mousedown", handleOutsideEmojiPickers);
    return () => document.removeEventListener("mousedown", handleOutsideEmojiPickers);
  }, []);
  const [generalLastSeenAt, setGeneralLastSeenAt] = useState<string>("");
  const [loadingByPeerId, setLoadingByPeerId] = useState<
    Record<string, boolean>
  >({});
  const [loadingOlderByPeerId, setLoadingOlderByPeerId] = useState<
    Record<string, boolean>
  >({});
  const [showScrollToLatestByPeerId, setShowScrollToLatestByPeerId] = useState<
    Record<string, boolean>
  >({});
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAttachments, setPreviewAttachments] = useState<CardAttachment[]>(
    [],
  );
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const loadingPeersRef = useRef(new Set<string>());
  const loadingOlderPeersRef = useRef(new Set<string>());
  const markReadInFlightRef = useRef(new Set<string>());
  const chatWindowsRef = useRef<ChatWindowState[]>([]);
  const openWindowCallbackRef = useRef<(peerUserId: string) => void>(() => {});
  const messagesByPeerIdRef = useRef<Record<string, ChatMessage[]>>({});
  const messagesPaginationByPeerIdRef = useRef<
    Record<string, Pagination | undefined>
  >({});
  const hasMoreMessagesByPeerIdRef = useRef<Record<string, boolean>>({});
  const replyJumpLoadingByPeerRef = useRef<Record<string, boolean>>({});
  const processedIncomingMessageKeysRef = useRef<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const composerInputRefs = useRef<Record<string, TextAreaRef | null>>({});
  const messageBodyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const messageEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const messageNodeByPeerIdRef = useRef<
    Record<string, Record<string, HTMLDivElement | null>>
  >({});
  const scrollRestoreByPeerIdRef = useRef<Record<string, ScrollRestore | null>>(
    {},
  );
  const pendingBottomScrollByPeerIdRef = useRef<Record<string, boolean>>({});
  const typingStopTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>(
    {},
  );
  const typingReceiveTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});
  const incomingAnimationTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});
  const jumpHighlightTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});
  const jumpVisibilityTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | null>
  >({});
  const outgoingTypingSentAtRef = useRef<Record<string, number>>({});
  const lastBackfillAttemptRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const lastIncomingSoundAtRef = useRef(0);
  const storageKey = `${CHAT_WINDOWS_STORAGE_PREFIX}_${currentUserId || "anon"}`;
  const generalSeenStorageKey = `${GENERAL_SEEN_STORAGE_PREFIX}_${currentUserId || "anon"}`;

  useEffect(() => {
    chatWindowsRef.current = chatWindows;
  }, [chatWindows]);

  useEffect(() => {
    messagesByPeerIdRef.current = messagesByPeerId;
  }, [messagesByPeerId]);

  useEffect(() => {
    messagesPaginationByPeerIdRef.current = messagesPaginationByPeerId;
  }, [messagesPaginationByPeerId]);

  useEffect(() => {
    hasMoreMessagesByPeerIdRef.current = hasMoreMessagesByPeerId;
  }, [hasMoreMessagesByPeerId]);

  useEffect(() => {
    if (!currentUserId) {
      setDidRestoreWindows(true);
      return;
    }

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        setDidRestoreWindows(true);
        return;
      }

      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) {
        setDidRestoreWindows(true);
        return;
      }

      const restored = parsed
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const value = item as Partial<ChatWindowState>;
          if (!value.peerUserId || typeof value.peerUserId !== "string") {
            return null;
          }

          return {
            peerUserId: value.peerUserId,
            minimized: Boolean(value.minimized),
            openedAt: Number(value.openedAt) || Date.now(),
          } as ChatWindowState;
        })
        .filter((item): item is ChatWindowState => Boolean(item));

      setChatWindows(enforceWindowLimit(restored));
    } catch (error) {
      console.error("[CHAT] Failed to restore windows", error);
    } finally {
      setDidRestoreWindows(true);
    }
  }, [currentUserId, storageKey]);

  useEffect(() => {
    if (!didRestoreWindows || !currentUserId) {
      return;
    }

    const payload = chatWindows.map((window) => ({
      peerUserId: window.peerUserId,
      minimized: window.minimized,
      openedAt: window.openedAt,
    }));
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [chatWindows, currentUserId, didRestoreWindows, storageKey]);

  useEffect(() => {
    if (!currentUserId || typeof window === "undefined") {
      return;
    }

    const savedSeenAt = window.localStorage.getItem(generalSeenStorageKey);
    setGeneralLastSeenAt(savedSeenAt || "");
  }, [currentUserId, generalSeenStorageKey]);

  useEffect(() => {
    if (!currentUserId || typeof window === "undefined") {
      return;
    }

    if (!generalLastSeenAt) {
      return;
    }

    window.localStorage.setItem(generalSeenStorageKey, generalLastSeenAt);
  }, [currentUserId, generalLastSeenAt, generalSeenStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unlockAudio = () => {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === "suspended") {
        void audioContextRef.current.resume().catch(() => {});
      }

      audioUnlockedRef.current = true;
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      audioUnlockedRef.current = false;
    };
  }, []);

  const conversationsQuery = useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: getChatConversations,
    staleTime: 15_000,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.chat.users(),
    queryFn: getChatUsers,
    enabled: Boolean(currentUserId),
    staleTime: 60_000,
  });

  const generalMessagesPollingQuery = useQuery({
    queryKey: GENERAL_ROOM_POLLING_QUERY_KEY,
    queryFn: () =>
      getGeneralRoomMessages({
        page: 1,
        limit: 100,
      }),
    enabled: Boolean(currentUserId),
    staleTime: 5_000,
    refetchInterval: isConnected
      ? CHAT_GENERAL_POLL_CONNECTED_MS
      : CHAT_GENERAL_POLL_DISCONNECTED_MS,
    refetchIntervalInBackground: true,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendChatMessage,
  });

  const markReadMutation = useMutation({
    mutationFn: markChatMessagesRead,
  });

  const conversations = useMemo(
    () => [...(conversationsQuery.data || [])].sort(sortByLatest),
    [conversationsQuery.data],
  );
  const users = usersQuery.data || [];

  const conversationByPeerId = useMemo(() => {
    const map = new Map<string, ChatConversation>();
    for (const conversation of conversations) {
      if (conversation.peerUserId) {
        map.set(conversation.peerUserId, conversation);
      }
    }
    return map;
  }, [conversations]);

  const userById = useMemo(() => {
    const map = new Map<string, ChatUser>();
    for (const user of users) {
      if (user.id) {
        map.set(user.id, user);
      }
    }
    return map;
  }, [users]);

  useEffect(() => {
    const seeds: PresenceUpdate[] = [];

    for (const conversation of conversations) {
      if (!conversation.peerUserId || conversation.peerUserId === currentUserId) {
        continue;
      }

      const status = getSeedPresenceStatus(conversation.peerUser);
      if (status !== "offline") {
        seeds.push({
          userId: conversation.peerUserId,
          status,
        });
      }
    }

    for (const user of users) {
      if (!user.id || user.id === currentUserId) {
        continue;
      }

      const status = getSeedPresenceStatus(user);
      if (status !== "offline") {
        seeds.push({
          userId: user.id,
          status,
        });
      }
    }

    if (seeds.length > 0) {
      mergePresenceUpdates(seeds);
    }
  }, [conversations, currentUserId, users]);

  const dmUnreadTotal = conversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCount || 0),
    0,
  );
  const roomUnreadTotal = Object.values(roomUnreadById).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const hasUnreadGeneralMention = useMemo(() => {
    const unreadCount = roomUnreadById[GENERAL_ROOM_ID] || 0;
    if (unreadCount <= 0) {
      return false;
    }

    const messages = messagesByPeerId[GENERAL_ROOM_ID] || [];
    if (messages.length === 0) {
      return false;
    }

    const unreadMessages = messages.slice(-unreadCount);
    return unreadMessages.some(
      (chatMessage) =>
        chatMessage.senderId !== currentUserId &&
        messageMentionsCurrentUser(chatMessage, currentUser),
    );
  }, [currentUser, currentUserId, messagesByPeerId, roomUnreadById]);

  const isGeneralMentionActive =
    Boolean(roomMentionById[GENERAL_ROOM_ID]) || hasUnreadGeneralMention;
  const hasRoomMention =
    isGeneralMentionActive ||
    Object.entries(roomMentionById).some(
      ([roomId, hasMention]) => roomId !== GENERAL_ROOM_ID && Boolean(hasMention),
    );
  const unreadTotal = dmUnreadTotal + roomUnreadTotal;

  const getSeedPresenceStatus = (peerUser?: ChatUser | null) =>
    normalizePresenceStatus(peerUser?.presenceStatus ?? peerUser?.isOnline);

  const mergePresenceUpdates = (
    updates: PresenceUpdate[],
    replace = false,
  ) => {
    if (replace) {
      const next: Record<string, ChatPresenceStatus> = {};
      for (const update of updates) {
        if (update.userId) {
          next[update.userId] = update.status;
        }
      }
      setPresenceByUserId(next);
      return;
    }

    setPresenceByUserId((current) => {
      let next = current;
      let changed = false;

      for (const update of updates) {
        if (!update.userId) {
          continue;
        }

        if (next[update.userId] === update.status) {
          continue;
        }

        if (!changed) {
          next = { ...current };
          changed = true;
        }

        next[update.userId] = update.status;
      }

      return changed ? next : current;
    });
  };

  const people = useMemo(() => {
    const map = new Map<string, PeerEntry>();

    map.set(GENERAL_ROOM_ID, {
      peerUserId: GENERAL_ROOM_ID,
      peerUser: normalizeChatUser({
        id: GENERAL_ROOM_ID,
        name: GENERAL_ROOM_NAME,
        roleName: GENERAL_ROOM_ROLE,
      }),
      unreadCount: roomUnreadById[GENERAL_ROOM_ID] || 0,
      lastMessage: generalLastActivity,
      updatedAt: undefined,
    });

    for (const conversation of conversations) {
      if (!conversation.peerUserId || conversation.peerUserId === currentUserId) {
        continue;
      }

      map.set(conversation.peerUserId, {
        peerUserId: conversation.peerUserId,
        peerUser: conversation.peerUser,
        unreadCount: conversation.unreadCount || 0,
        lastMessage: summarizeMessageContent(conversation.lastMessage?.content || ""),
        updatedAt:
          conversation.updatedAt ||
          conversation.lastMessage?.createdAt ||
          undefined,
      });
    }

    for (const user of users) {
      if (!user.id || user.id === currentUserId) {
        continue;
      }

      const current = map.get(user.id);
      map.set(user.id, {
        peerUserId: user.id,
        peerUser: {
          ...user,
          name: user.name || current?.peerUser?.name || user.id,
          avatar: user.avatar || current?.peerUser?.avatar,
          username: user.username || current?.peerUser?.username,
          email: user.email || current?.peerUser?.email,
        },
        unreadCount: current?.unreadCount || 0,
        lastMessage: current?.lastMessage || "",
        updatedAt: current?.updatedAt,
      });
    }

    return Array.from(map.values()).sort((left, right) => {
      if (left.peerUserId === GENERAL_ROOM_ID && right.peerUserId !== GENERAL_ROOM_ID) {
        return -1;
      }
      if (right.peerUserId === GENERAL_ROOM_ID && left.peerUserId !== GENERAL_ROOM_ID) {
        return 1;
      }

      if ((right.unreadCount || 0) !== (left.unreadCount || 0)) {
        return (right.unreadCount || 0) - (left.unreadCount || 0);
      }

      const leftTime = left.updatedAt || "";
      const rightTime = right.updatedAt || "";
      if (leftTime !== rightTime) {
        return rightTime.localeCompare(leftTime);
      }

      return (left.peerUser.name || "").localeCompare(right.peerUser.name || "");
    });
  }, [
    conversations,
    currentUserId,
    generalLastActivity,
    messagesByPeerId,
    roomUnreadById,
    users,
  ]);

  const filteredPeople = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return people;
    }

    return people.filter((entry) => {
      const name = entry.peerUser.name || "";
      const username = entry.peerUser.username || "";
      const roleName = entry.peerUser.roleName || "";
      const email = entry.peerUser.email || "";
      const lastMessage =
        entry.peerUserId === GENERAL_ROOM_ID ? "" : entry.lastMessage || "";

      return (
        name.toLowerCase().includes(needle) ||
        username.toLowerCase().includes(needle) ||
        roleName.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle) ||
        lastMessage.toLowerCase().includes(needle)
      );
    });
  }, [people, searchTerm]);

  const generalMentionUsers = useMemo(() => {
    const map = new Map<string, ChatUser>();

    for (const entry of people) {
      if (
        !entry.peerUserId ||
        entry.peerUserId === GENERAL_ROOM_ID ||
        entry.peerUserId === currentUserId
      ) {
        continue;
      }

      if (!map.has(entry.peerUserId)) {
        map.set(entry.peerUserId, entry.peerUser);
      }
    }

    const roomMessages = messagesByPeerId[GENERAL_ROOM_ID] || [];
    for (const message of roomMessages) {
      const senderId = message.senderId || message.sender?.id || "";
      if (!senderId || senderId === currentUserId || map.has(senderId)) {
        continue;
      }

      map.set(
        senderId,
        normalizeChatUser({
          id: senderId,
          name: message.sender?.name || message.sender?.username || senderId,
          username: message.sender?.username,
          roleName: message.sender?.roleName,
          email: message.sender?.email,
          avatar: message.sender?.avatar,
          isOnline: message.sender?.isOnline,
          presenceStatus: message.sender?.presenceStatus,
        }),
      );
    }

    const sortedUsers = Array.from(map.values()).sort((left, right) =>
      (left.name || "").localeCompare(right.name || ""),
    );

    const mentionAllOption = normalizeChatUser({
      id: GENERAL_MENTION_ALL_ID,
      name: GENERAL_MENTION_ALL_LABEL,
      username: MENTION_ALL_TOKEN,
      roleName: GENERAL_MENTION_ALL_ROLE,
    });

    return [mentionAllOption, ...sortedUsers];
  }, [currentUserId, messagesByPeerId, people]);

  const visibleWindows = useMemo(
    () =>
      chatWindows
        .filter((window) => !window.minimized)
        .sort((left, right) => left.openedAt - right.openedAt),
    [chatWindows],
  );

  const minimizedWindows = useMemo(
    () =>
      chatWindows
        .filter((window) => window.minimized)
        .sort((left, right) => right.openedAt - left.openedAt),
    [chatWindows],
  );

  const visibleMinimizedWindows = minimizedWindows.slice(0, MAX_VISIBLE_MINIMIZED);
  const overflowMinimizedWindows = minimizedWindows.slice(MAX_VISIBLE_MINIMIZED);

  const getPeerUser = (peerUserId: string) => {
    if (isGeneralRoom(peerUserId)) {
      return normalizeChatUser({
        id: GENERAL_ROOM_ID,
        name: GENERAL_ROOM_NAME,
        roleName: GENERAL_ROOM_ROLE,
      });
    }

    const conversationPeer = conversationByPeerId.get(peerUserId)?.peerUser;
    const userPeer = userById.get(peerUserId);
    return (
      conversationPeer ||
      userPeer ||
      normalizeChatUser({ id: peerUserId, name: "Unknown user", username: "" })
    );
  };

  const getPeerPresenceStatus = (peerUserId: string): ChatPresenceStatus =>
    presenceByUserId[peerUserId] ?? getSeedPresenceStatus(getPeerUser(peerUserId));

  const renderPresenceAvatar = (
    peerUser: ChatUser,
    presenceStatus: ChatPresenceStatus,
    size?: number,
    className?: string,
  ) => {
    const isGroupRoomAvatar = peerUser.id === GENERAL_ROOM_ID;

    return (
    <span
      className={`${styles.presenceAvatarWrap} ${
        size && size >= 40 ? styles.presenceAvatarWrapLarge : ""
      } ${isGroupRoomAvatar ? styles.presenceAvatarWrapGroup : ""}`}
    >
      <Avatar
        src={peerUser.avatar}
        size={size}
        className={`${className || ""} ${
          isGroupRoomAvatar ? styles.groupAvatarOutline : ""
        }`}
      >
        {isGroupRoomAvatar ? (
          <TeamOutlined className={styles.groupAvatarIcon} />
        ) : (
          peerUser.name?.slice(0, 1)
        )}
      </Avatar>
      {peerUser.id !== GENERAL_ROOM_ID ? (
        <span
          className={`${styles.presenceDot} ${
            presenceStatus === "online"
              ? styles.presenceDotOnline
              : presenceStatus === "idle"
                ? styles.presenceDotIdle
                : styles.presenceDotOffline
          }`}
        />
      ) : null}
    </span>
    );
  };

  const clearTypingStopTimer = (peerUserId: string) => {
    const timer = typingStopTimersRef.current[peerUserId];
    if (timer) {
      clearTimeout(timer);
      typingStopTimersRef.current[peerUserId] = null;
    }
  };

  const clearTypingReceiveTimer = (peerUserId: string) => {
    const timer = typingReceiveTimersRef.current[peerUserId];
    if (timer) {
      clearTimeout(timer);
      typingReceiveTimersRef.current[peerUserId] = null;
    }
  };

  const setTypingState = (peerUserId: string, isTyping: boolean) => {
    setTypingByUserId((current) => {
      if (current[peerUserId] === isTyping) {
        return current;
      }

      return {
        ...current,
        [peerUserId]: isTyping,
      };
    });
  };

  const markIncomingMessageAnimated = (messageId?: string) => {
    if (!messageId) {
      return;
    }

    setIncomingAnimatedByMessageId((current) => ({
      ...current,
      [messageId]: true,
    }));

    const existingTimer = incomingAnimationTimersRef.current[messageId];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    incomingAnimationTimersRef.current[messageId] = setTimeout(() => {
      setIncomingAnimatedByMessageId((current) => {
        if (!current[messageId]) {
          return current;
        }

        const next = { ...current };
        delete next[messageId];
        return next;
      });
      incomingAnimationTimersRef.current[messageId] = null;
    }, 700);
  };

  const markJumpHighlighted = (messageId?: string) => {
    if (!messageId) {
      return;
    }

    setJumpHighlightedByMessageId((current) => ({
      ...current,
      [messageId]: true,
    }));

    const existingTimer = jumpHighlightTimersRef.current[messageId];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    jumpHighlightTimersRef.current[messageId] = setTimeout(() => {
      setJumpHighlightedByMessageId((current) => {
        if (!current[messageId]) {
          return current;
        }

        const next = { ...current };
        delete next[messageId];
        return next;
      });
      jumpHighlightTimersRef.current[messageId] = null;
    }, 1200);
  };

  const markJumpHighlightedWhenVisible = (
    peerUserId: string,
    messageId: string,
    attempt = 0,
  ) => {
    const timerKey = `${peerUserId}:${messageId}`;
    const messageNode = messageNodeByPeerIdRef.current[peerUserId]?.[messageId];
    const messageBody = messageBodyRefs.current[peerUserId];

    if (!messageNode || !messageBody) {
      markJumpHighlighted(messageId);
      return;
    }

    const messageRect = messageNode.getBoundingClientRect();
    const bodyRect = messageBody.getBoundingClientRect();
    const isVisible =
      messageRect.bottom >= bodyRect.top + 6 &&
      messageRect.top <= bodyRect.bottom - 6;

    if (isVisible || attempt >= 18) {
      markJumpHighlighted(messageId);
      if (jumpVisibilityTimersRef.current[timerKey]) {
        clearTimeout(jumpVisibilityTimersRef.current[timerKey]!);
        jumpVisibilityTimersRef.current[timerKey] = null;
      }
      return;
    }

    if (jumpVisibilityTimersRef.current[timerKey]) {
      clearTimeout(jumpVisibilityTimersRef.current[timerKey]!);
    }

    jumpVisibilityTimersRef.current[timerKey] = setTimeout(() => {
      markJumpHighlightedWhenVisible(peerUserId, messageId, attempt + 1);
    }, 120);
  };

  const normalizeReplyMatchValue = (value?: string) =>
    (value || "").trim().toLowerCase();

  const isMessageNodeVisibleInBody = (
    peerUserId: string,
    messageId: string,
  ) => {
    const targetNode = messageNodeByPeerIdRef.current[peerUserId]?.[messageId];
    const messageBody = messageBodyRefs.current[peerUserId];
    if (!targetNode || !messageBody) {
      return false;
    }

    const messageRect = targetNode.getBoundingClientRect();
    const bodyRect = messageBody.getBoundingClientRect();
    return (
      messageRect.bottom >= bodyRect.top + 6 &&
      messageRect.top <= bodyRect.bottom - 6
    );
  };

  const resolveReplyTargetMessageId = (
    peerUserId: string,
    rawReplyMessageId?: string,
    replyAuthor?: string,
    replyText?: string,
  ) => {
    const loadedMessages = messagesByPeerIdRef.current[peerUserId] || [];
    if (loadedMessages.length === 0) {
      return null;
    }

    const normalizedReplyId = (rawReplyMessageId || "").trim();
    if (normalizedReplyId) {
      const exactMessage = loadedMessages.find(
        (chatMessage) => chatMessage.id === normalizedReplyId,
      );
      if (exactMessage?.id) {
        return exactMessage.id;
      }

      const looseMessage = loadedMessages.find(
        (chatMessage) =>
          chatMessage.id &&
          chatMessage.id.trim().toLowerCase() === normalizedReplyId.toLowerCase(),
      );
      if (looseMessage?.id) {
        return looseMessage.id;
      }
    }

    const normalizedReplyText = normalizeReplyMatchValue(
      toReplySnippet(replyText || ""),
    );
    if (!normalizedReplyText) {
      return null;
    }

    const normalizedReplyAuthor = normalizeReplyMatchValue(replyAuthor);
    const peerUser = getPeerUser(peerUserId);

    const fallbackMatches = loadedMessages.filter((chatMessage) => {
      const candidateSummary = normalizeReplyMatchValue(
        toReplySnippet(summarizeMessageContent(chatMessage.content || "")),
      );
      if (!candidateSummary || candidateSummary !== normalizedReplyText) {
        return false;
      }

      if (!normalizedReplyAuthor) {
        return true;
      }

      const authorCandidates = new Set<string>();
      authorCandidates.add(
        normalizeReplyMatchValue(chatMessage.sender?.name || ""),
      );
      authorCandidates.add(
        normalizeReplyMatchValue(chatMessage.sender?.username || ""),
      );

      if (chatMessage.senderId && userById.get(chatMessage.senderId)) {
        const senderUser = userById.get(chatMessage.senderId);
        authorCandidates.add(normalizeReplyMatchValue(senderUser?.name || ""));
        authorCandidates.add(normalizeReplyMatchValue(senderUser?.username || ""));
      }

      if (chatMessage.senderId && currentUserId && chatMessage.senderId === currentUserId) {
        authorCandidates.add(normalizeReplyMatchValue(currentUser?.username || ""));
        authorCandidates.add(normalizeReplyMatchValue(currentUser?.name || ""));
      }

      if (chatMessage.senderId && peerUser.id && chatMessage.senderId === peerUser.id) {
        authorCandidates.add(normalizeReplyMatchValue(peerUser.name || ""));
        authorCandidates.add(normalizeReplyMatchValue(peerUser.username || ""));
      }

      return authorCandidates.has(normalizedReplyAuthor);
    });

    return fallbackMatches.length > 0 ? fallbackMatches[fallbackMatches.length - 1].id : null;
  };

  const jumpToRepliedMessage = async (
    peerUserId: string,
    messageId?: string,
    replyAuthor?: string,
    replyText?: string,
  ) => {
    const findAndScrollTarget = () => {
      const targetMessageId = resolveReplyTargetMessageId(
        peerUserId,
        messageId,
        replyAuthor,
        replyText,
      );
      if (!targetMessageId) {
        return false;
      }

      if (isMessageNodeVisibleInBody(peerUserId, targetMessageId)) {
        markJumpHighlighted(targetMessageId);
        return true;
      }

      const targetNode =
        messageNodeByPeerIdRef.current[peerUserId]?.[targetMessageId];
      if (!targetNode) {
        return false;
      }

      targetNode.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      markJumpHighlightedWhenVisible(peerUserId, targetMessageId);
      return true;
    };

    if (findAndScrollTarget()) {
      return;
    }

    if (replyJumpLoadingByPeerRef.current[peerUserId]) {
      return;
    }

    replyJumpLoadingByPeerRef.current[peerUserId] = true;

    try {
      let loadedPages = 0;
      let pagination = messagesPaginationByPeerIdRef.current[peerUserId];
      let nextPage =
        pagination?.nextPage ||
        (pagination?.page ? pagination.page + 1 : 2);
      let hasMore =
        hasMoreMessagesByPeerIdRef.current[peerUserId] ??
        Boolean(nextPage);

      while (
        hasMore &&
        nextPage &&
        loadedPages < CHAT_REPLY_JUMP_MAX_PAGE_LOADS
      ) {
        const loadResult = await loadMessages(peerUserId, {
          page: nextPage,
          silent: true,
          preserveScroll: true,
        });

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        if (findAndScrollTarget()) {
          return;
        }

        if (!loadResult) {
          break;
        }

        nextPage = loadResult.nextPage;
        hasMore = loadResult.hasMore;
        loadedPages += 1;
      }

      if (!findAndScrollTarget()) {
        message.info("Original message is not available in loaded history");
      }
    } finally {
      replyJumpLoadingByPeerRef.current[peerUserId] = false;
    }
  };

  const scheduleScrollToBottom = (peerUserId: string) => {
    pendingBottomScrollByPeerIdRef.current[peerUserId] = true;
    const body = messageBodyRefs.current[peerUserId];
    if (!body) {
      return;
    }
    const end = messageEndRefs.current[peerUserId];

    requestAnimationFrame(() => {
      if (end) {
        end.scrollIntoView({ block: "end" });
      }
      body.scrollTop = body.scrollHeight;
      setShowScrollToLatestByPeerId((current) => {
        if (!current[peerUserId]) {
          return current;
        }

        return {
          ...current,
          [peerUserId]: false,
        };
      });
    });
  };

  const updateScrollToLatestVisibility = (peerUserId: string) => {
    const body = messageBodyRefs.current[peerUserId];
    if (!body) {
      return;
    }

    const distanceFromBottom =
      body.scrollHeight - body.scrollTop - body.clientHeight;
    const shouldShow = distanceFromBottom > CHAT_SCROLL_TO_LATEST_THRESHOLD;

    setShowScrollToLatestByPeerId((current) => {
      if (Boolean(current[peerUserId]) === shouldShow) {
        return current;
      }

      return {
        ...current,
        [peerUserId]: shouldShow,
      };
    });
  };

  const restoreScrollPosition = (peerUserId: string) => {
    const body = messageBodyRefs.current[peerUserId];
    const restore = scrollRestoreByPeerIdRef.current[peerUserId];
    if (!body || !restore) {
      return;
    }

    requestAnimationFrame(() => {
      const nextScrollTop =
        body.scrollHeight - restore.scrollHeight + restore.scrollTop;
      body.scrollTop = Math.max(nextScrollTop, 0);
      scrollRestoreByPeerIdRef.current[peerUserId] = null;
    });
  };

  const mergePeerMessages = (
    peerUserId: string,
    nextMessages: ChatMessage[],
    replace = false,
  ) => {
    setMessagesByPeerId((current) => {
      const existing = replace ? [] : current[peerUserId] || [];
      return {
        ...current,
        [peerUserId]: mergeMessageLists(existing, nextMessages),
      };
    });
  };

  const updateMessagesForPeer = (
    peerUserId: string,
    updater: (messages: ChatMessage[]) => ChatMessage[],
  ) => {
    setMessagesByPeerId((current) => {
      const existing = current[peerUserId];
      if (!existing) {
        return current;
      }

      const nextMessages = updater(existing);
      return {
        ...current,
        [peerUserId]: nextMessages,
      };
    });
  };

  const updateQueryMessagesForPeer = (
    peerUserId: string,
    updater: (messages: ChatMessage[]) => ChatMessage[],
  ) => {
    queryClient.setQueryData<ChatMessage[]>(
      queryKeys.chat.messages(peerUserId),
      (current) => updater(current || []),
    );
  };

  const isPeerOnlineForDelivery = (peerUserId: string) => {
    const presenceStatus = getPeerPresenceStatus(peerUserId);
    return presenceStatus === "online" || presenceStatus === "idle";
  };

  const getMessageDeliveryLabel = (
    chatMessage: ChatMessage,
    peerUserId: string,
  ) => {
    if (!chatMessage.isRead) {
      return isPeerOnlineForDelivery(peerUserId) ? "Delivered" : "Sent";
    }

    return "Seen";
  };

  const updateReadReceiptState = (
    peerUserId: string,
    messageIds?: string[],
  ) => {
    const hasSpecificMessages = Array.isArray(messageIds) && messageIds.length > 0;
    const idSet = hasSpecificMessages ? new Set(messageIds) : null;

    const patchMessages = (messages: ChatMessage[]) =>
      messages.map((message) => {
        const isOwnMessage =
          Boolean(currentUserId) && message.senderId === currentUserId;
        if (!isOwnMessage || message.peerUserId !== peerUserId) {
          return message;
        }

        if (idSet && !idSet.has(message.id)) {
          return message;
        }

        if (message.isRead) {
          return message;
        }

        return {
          ...message,
          isRead: true,
        };
      });

    updateMessagesForPeer(peerUserId, patchMessages);
    updateQueryMessagesForPeer(peerUserId, patchMessages);

    queryClient.setQueryData<ChatConversation[]>(
      queryKeys.chat.conversations(),
      (current) =>
        (current || []).map((conversation) => {
          if (conversation.peerUserId !== peerUserId) {
            return conversation;
          }

          if (
            conversation.lastMessage &&
            currentUserId &&
            conversation.lastMessage.senderId === currentUserId
          ) {
            return {
              ...conversation,
              lastMessage: {
                ...conversation.lastMessage,
                isRead: true,
              },
            };
          }

          return conversation;
        }),
    );
  };

  const sendTypingState = async (peerUserId: string, isTyping: boolean) => {
    try {
      if (isGeneralRoom(peerUserId)) {
        await sendChatTyping({
          roomId: GENERAL_ROOM_ID,
          isTyping,
        });
      } else {
        await sendChatTyping({
          peerUserId,
          isTyping,
        });
      }
    } catch (error) {
      console.error("[CHAT] Failed to send typing state", error);
    }
  };

  const announceTypingIfNeeded = (peerUserId: string) => {
    const now = Date.now();
    const lastSentAt = outgoingTypingSentAtRef.current[peerUserId] || 0;
    if (now - lastSentAt < CHAT_TYPING_THROTTLE_MS) {
      return;
    }

    outgoingTypingSentAtRef.current[peerUserId] = now;
    void sendTypingState(peerUserId, true);
  };

  const stopTyping = (peerUserId: string) => {
    clearTypingStopTimer(peerUserId);
    const lastSentAt = outgoingTypingSentAtRef.current[peerUserId];
    if (lastSentAt) {
      outgoingTypingSentAtRef.current[peerUserId] = 0;
      void sendTypingState(peerUserId, false);
    }
  };

  const setPeerUnreadZero = (peerUserId: string) => {
    if (isGeneralRoom(peerUserId)) {
      setRoomUnreadById((current) => ({
        ...current,
        [GENERAL_ROOM_ID]: 0,
      }));
      return;
    }

    queryClient.setQueryData<ChatConversation[]>(
      queryKeys.chat.conversations(),
      (current) => upsertUnreadCount(current, peerUserId, 0),
    );
  };

  const markGeneralRoomSeen = (latestMessage?: ChatMessage) => {
    const seenAt = latestMessage?.createdAt || new Date().toISOString();

    setGeneralLastSeenAt((current) => (current === seenAt ? current : seenAt));

    setRoomUnreadById((current) => {
      if ((current[GENERAL_ROOM_ID] || 0) === 0) {
        return current;
      }

      return {
        ...current,
        [GENERAL_ROOM_ID]: 0,
      };
    });

    setRoomMentionById((current) => {
      if (!current[GENERAL_ROOM_ID]) {
        return current;
      }

      return {
        ...current,
        [GENERAL_ROOM_ID]: false,
      };
    });
  };

  const playIncomingMessageSound = () => {
    if (!audioUnlockedRef.current || !audioContextRef.current) {
      return;
    }

    const nowMs = Date.now();
    if (nowMs - lastIncomingSoundAtRef.current < 300) {
      return;
    }
    lastIncomingSoundAtRef.current = nowMs;

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
      return;
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.17);
  };

  const loadMessages = async (
    peerUserId: string,
    options: { page?: number; silent?: boolean; preserveScroll?: boolean } = {},
  ): Promise<LoadMessagesResult | null> => {
    if (!peerUserId) {
      return null;
    }

    const page = options.page || 1;
    const isOlderPage = page > 1;
    const loadingRef = isOlderPage ? loadingOlderPeersRef : loadingPeersRef;

    if (loadingRef.current.has(peerUserId)) {
      return null;
    }

    loadingRef.current.add(peerUserId);
    if (isOlderPage) {
      setLoadingOlderByPeerId((current) => ({ ...current, [peerUserId]: true }));
    } else if (!options.silent) {
      setLoadingByPeerId((current) => ({ ...current, [peerUserId]: true }));
    }

    if (options.preserveScroll) {
      const body = messageBodyRefs.current[peerUserId];
      if (body) {
        scrollRestoreByPeerIdRef.current[peerUserId] = {
          scrollTop: body.scrollTop,
          scrollHeight: body.scrollHeight,
        };
      }
    }

    try {
      const response = isGeneralRoom(peerUserId)
        ? await getGeneralRoomMessages({
            page,
            limit: CHAT_MESSAGE_PAGE_SIZE,
          })
        : await getChatMessages(peerUserId, {
            page,
            limit: CHAT_MESSAGE_PAGE_SIZE,
          });

      const fetchedMessages = response.messages.map((chatMessage) => ({
        ...chatMessage,
        peerUserId:
          chatMessage.peerUserId || (isGeneralRoom(peerUserId) ? GENERAL_ROOM_ID : peerUserId),
      }));

      mergePeerMessages(peerUserId, fetchedMessages);
      queryClient.setQueryData<ChatMessage[]>(
        isGeneralRoom(peerUserId)
          ? queryKeys.chat.roomMessages(GENERAL_ROOM_ID)
          : queryKeys.chat.messages(peerUserId),
        (current) => mergeMessageLists(current || [], fetchedMessages),
      );

      const nextPage =
        response.paginate?.nextPage ||
        (fetchedMessages.length >= CHAT_MESSAGE_PAGE_SIZE ? page + 1 : 0);
      const paginate: Pagination = response.paginate || {
        limit: CHAT_MESSAGE_PAGE_SIZE,
        page,
        totalData: fetchedMessages.length,
        totalPage: nextPage ? page + 1 : page,
        nextPage,
        prevPage: page > 1 ? page - 1 : 0,
      };

      setMessagesPaginationByPeerId((current) => ({
        ...current,
        [peerUserId]: paginate,
      }));
      messagesPaginationByPeerIdRef.current = {
        ...messagesPaginationByPeerIdRef.current,
        [peerUserId]: paginate,
      };

      const hasMore =
        Boolean(paginate.nextPage) ||
        Boolean(paginate.totalPage > paginate.page) ||
        fetchedMessages.length >= CHAT_MESSAGE_PAGE_SIZE;
      setHasMoreMessagesByPeerId((current) => ({
        ...current,
        [peerUserId]: hasMore,
      }));
      hasMoreMessagesByPeerIdRef.current = {
        ...hasMoreMessagesByPeerIdRef.current,
        [peerUserId]: hasMore,
      };

      if (page === 1 && !options.preserveScroll) {
        scheduleScrollToBottom(peerUserId);
      } else if (options.preserveScroll) {
        restoreScrollPosition(peerUserId);
      }

      return {
        nextPage,
        hasMore,
      };
    } catch (error) {
      console.error("[CHAT] Failed to load messages", error);
      if (!options.silent) {
        message.error("Failed to load messages");
      }
      return null;
    } finally {
      loadingRef.current.delete(peerUserId);
      if (isOlderPage) {
        setLoadingOlderByPeerId((current) => ({ ...current, [peerUserId]: false }));
      } else if (!options.silent) {
        setLoadingByPeerId((current) => ({ ...current, [peerUserId]: false }));
      }
    }
  };

  const loadOlderMessages = async (peerUserId: string) => {
    const body = messageBodyRefs.current[peerUserId];
    const paginate = messagesPaginationByPeerId[peerUserId];
    const nextPage = paginate?.nextPage || (paginate?.page ? paginate.page + 1 : 2);

    if (!body || !nextPage || loadingOlderPeersRef.current.has(peerUserId)) {
      return;
    }

    scrollRestoreByPeerIdRef.current[peerUserId] = {
      scrollTop: body.scrollTop,
      scrollHeight: body.scrollHeight,
    };

    await loadMessages(peerUserId, {
      page: nextPage,
      silent: true,
      preserveScroll: true,
    });
  };

  useEffect(() => {
    const polledMessages = generalMessagesPollingQuery.data?.messages || [];
    if (!currentUserId || polledMessages.length === 0) {
      return;
    }

    const normalizedMessages = polledMessages.map((chatMessage) => ({
      ...chatMessage,
      peerUserId: chatMessage.peerUserId || GENERAL_ROOM_ID,
      roomId: chatMessage.roomId || GENERAL_ROOM_ID,
      roomName: chatMessage.roomName || GENERAL_ROOM_NAME,
    }));

    setMessagesByPeerId((current) => ({
      ...current,
      [GENERAL_ROOM_ID]: mergeMessageLists(
        current[GENERAL_ROOM_ID] || [],
        normalizedMessages,
      ),
    }));

    const latestMessage = normalizedMessages[normalizedMessages.length - 1];
    const existingWindow = chatWindowsRef.current.find(
      (window) => window.peerUserId === GENERAL_ROOM_ID,
    );
    const isOpenAndActive = Boolean(existingWindow && !existingWindow.minimized);

    if (isOpenAndActive) {
      scheduleScrollToBottom(GENERAL_ROOM_ID);
      markGeneralRoomSeen(latestMessage);
      return;
    }

    if (isConnected) {
      return;
    }

    const lastSeenAtMs = generalLastSeenAt
      ? new Date(generalLastSeenAt).getTime()
      : 0;

    if (!Number.isFinite(lastSeenAtMs) || lastSeenAtMs <= 0) {
      if (latestMessage?.createdAt) {
        setGeneralLastSeenAt(latestMessage.createdAt);
      }
      return;
    }

    const unseenMessages = normalizedMessages.filter((chatMessage) => {
      const createdAtMs = chatMessage.createdAt
        ? new Date(chatMessage.createdAt).getTime()
        : 0;

      if (!Number.isFinite(createdAtMs) || createdAtMs <= lastSeenAtMs) {
        return false;
      }

      return Boolean(chatMessage.senderId && chatMessage.senderId !== currentUserId);
    });

    const unreadCount = unseenMessages.length;
    setRoomUnreadById((current) => {
      if ((current[GENERAL_ROOM_ID] || 0) === unreadCount) {
        return current;
      }

      return {
        ...current,
        [GENERAL_ROOM_ID]: unreadCount,
      };
    });

    const hasMention = unseenMessages.some((chatMessage) =>
      messageMentionsCurrentUser(chatMessage, currentUser),
    );
    setRoomMentionById((current) => {
      if (Boolean(current[GENERAL_ROOM_ID]) === hasMention) {
        return current;
      }

      return {
        ...current,
        [GENERAL_ROOM_ID]: hasMention,
      };
    });
  }, [
    currentUser,
    currentUserId,
    generalLastSeenAt,
    generalMessagesPollingQuery.data?.messages,
    isConnected,
  ]);

  useEffect(() => {
    if (!didRestoreWindows || !isConnected || connectionAttempts <= 1) {
      return;
    }

    if (lastBackfillAttemptRef.current === connectionAttempts) {
      return;
    }

    lastBackfillAttemptRef.current = connectionAttempts;

    queryClient.invalidateQueries({
      queryKey: queryKeys.chat.conversations(),
      exact: false,
    });

    for (const window of visibleWindows) {
      void loadMessages(window.peerUserId, {
        page: 1,
        silent: true,
        preserveScroll: true,
      });
    }
  }, [
    connectionAttempts,
    didRestoreWindows,
    isConnected,
    loadMessages,
    queryClient,
    visibleWindows,
  ]);

  const openWindow = (peerUserId: string) => {
    if (!peerUserId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("chat:window-opened", { detail: { peerUserId } }),
    );

    setIsComposerOpen(false);
    setIsOverflowOpen(false);

    setChatWindows((current) =>
      enforceWindowLimit(
        upsertWindow(current, peerUserId, {
          minimized: false,
          openedAt: Date.now(),
        }),
      ),
    );

    void loadMessages(peerUserId);

    if (isGeneralRoom(peerUserId)) {
      const latestGeneralMessage = (
        messagesByPeerIdRef.current[GENERAL_ROOM_ID] || []
      ).slice(-1)[0];
      markGeneralRoomSeen(latestGeneralMessage);
      return;
    }

    if ((conversationByPeerId.get(peerUserId)?.unreadCount || 0) > 0) {
      markReadMutation.mutate(
        { peerUserId },
        {
          onSuccess: () => setPeerUnreadZero(peerUserId),
        },
      );
    }
  };

  // Keep ref in sync so the chat:open-window listener always calls the latest version
  openWindowCallbackRef.current = openWindow;

  useEffect(() => {
    const handler = (e: Event) => {
      const { peerUserId } = (e as CustomEvent<{ peerUserId: string }>).detail;
      openWindowCallbackRef.current(peerUserId);
    };
    window.addEventListener("chat:open-window", handler);
    return () => window.removeEventListener("chat:open-window", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minimizeWindow = (peerUserId: string) => {
    setChatWindows((current) =>
      upsertWindow(current, peerUserId, {
        minimized: true,
        openedAt: Date.now(),
      }),
    );
  };

  const closeWindow = (peerUserId: string) => {
    stopTyping(peerUserId);
    clearTypingReceiveTimer(peerUserId);
    scrollRestoreByPeerIdRef.current[peerUserId] = null;
    pendingBottomScrollByPeerIdRef.current[peerUserId] = false;
    setChatWindows((current) =>
      current.filter((window) => window.peerUserId !== peerUserId),
    );
    setDraftByPeerId((current) => {
      if (!(peerUserId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[peerUserId];
      return next;
    });
    setReplyByPeerId((current) => {
      if (!(peerUserId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[peerUserId];
      return next;
    });
    setPendingFilesByPeerId((current) => {
      if (!(peerUserId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[peerUserId];
      return next;
    });
    setIsDragOverByPeerId((current) => {
      if (!(peerUserId in current)) {
        return current;
      }

      const next = { ...current };
      delete next[peerUserId];
      return next;
    });
  };

  const queueFilesForPeer = (peerUserId: string, incomingFiles: File[]) => {
    if (!peerUserId || incomingFiles.length === 0) {
      return;
    }

    setPendingFilesByPeerId((current) => {
      const existing = current[peerUserId] || [];
      const knownFiles = new Set(
        existing.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const nextFiles = [...existing];

      for (const file of incomingFiles) {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
        if (knownFiles.has(fileKey)) {
          continue;
        }
        knownFiles.add(fileKey);
        nextFiles.push(file);
      }

      return {
        ...current,
        [peerUserId]: nextFiles,
      };
    });
  };

  const removePendingFile = (peerUserId: string, index: number) => {
    setPendingFilesByPeerId((current) => {
      const files = current[peerUserId] || [];
      if (!files[index]) {
        return current;
      }

      const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
      return {
        ...current,
        [peerUserId]: nextFiles,
      };
    });
  };

  const handleFileSelection = (
    peerUserId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    queueFilesForPeer(peerUserId, files);
    event.target.value = "";
  };

  const handleComposerPaste = (
    peerUserId: string,
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const files: File[] = [];
    const items = Array.from(event.clipboardData?.items || []);

    for (const item of items) {
      if (item.kind !== "file") {
        continue;
      }
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    queueFilesForPeer(peerUserId, files);
  };

  const handleComposerDrop = (
    peerUserId: string,
    event: DragEvent<HTMLElement>,
  ) => {
    if (!isFileDragEvent(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverByPeerId((current) => ({ ...current, [peerUserId]: false }));
    queueFilesForPeer(peerUserId, Array.from(event.dataTransfer.files || []));
  };

  const openAttachmentPreview = (
    chatMessage: ChatMessage,
    attachments: ChatAttachmentMetadata[],
    clickedIndex: number,
  ) => {
    const previewData = attachments.map((attachment, index) =>
      toPreviewAttachment(attachment, chatMessage.id, index, currentUserId),
    );

    if (previewData.length === 0) {
      return;
    }

    const safeIndex =
      clickedIndex >= 0 && clickedIndex < previewData.length ? clickedIndex : 0;
    setPreviewAttachments(previewData);
    setPreviewInitialIndex(safeIndex);
    setPreviewModalOpen(true);
  };

  const focusComposerInput = (peerUserId: string, attempt = 0) => {
    const inputRef = composerInputRefs.current[peerUserId];
    const inputElement = inputRef?.resizableTextArea?.textArea;

    if (inputRef && (!inputElement || !inputElement.disabled)) {
      inputRef.focus();
      return;
    }

    if (attempt >= 10) {
      return;
    }

    setTimeout(() => {
      focusComposerInput(peerUserId, attempt + 1);
    }, 40);
  };

  const applyReactionsToCaches = useCallback(
    (messageId: string, reactions: any[]) => {
      setMessagesByPeerId((current) => {
        const next: Record<string, ChatMessage[]> = {};
        for (const [peerId, messages] of Object.entries(current)) {
          next[peerId] = messages.map((msg) =>
            msg.id === messageId ? { ...msg, reactions } : msg,
          );
        }
        return next;
      });

      const patchMessages = (old: any) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.map((msg: any) =>
            msg?.id === messageId ? { ...msg, reactions } : msg,
          );
        }

        if (Array.isArray(old?.messages)) {
          return {
            ...old,
            messages: old.messages.map((msg: any) =>
              msg?.id === messageId ? { ...msg, reactions } : msg,
            ),
          };
        }

        return old;
      };

      queryClient.setQueriesData(
        { queryKey: queryKeys.chat.messages(""), exact: false },
        patchMessages,
      );
      queryClient.setQueriesData(
        { queryKey: queryKeys.chat.roomMessages("general"), exact: false },
        patchMessages,
      );
    },
    [queryClient],
  );

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const reactions = await addReactionApi(messageId, emoji);
        applyReactionsToCaches(messageId, reactions);
      } catch {
        message.error("Failed to add reaction");
      }
    },
    [applyReactionsToCaches],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const reactions = await removeReactionApi(messageId, emoji);
        applyReactionsToCaches(messageId, reactions);
      } catch {
        message.error("Failed to remove reaction");
      }
    },
    [applyReactionsToCaches],
  );

  const handleSend = async (peerUserId: string) => {
    const replyTarget = replyByPeerId[peerUserId];
    const content = (draftByPeerId[peerUserId] || "").trim();
    const pendingFiles = pendingFilesByPeerId[peerUserId] || [];

    if ((!content && pendingFiles.length === 0) || sendingByPeerId[peerUserId]) {
      return;
    }

    setSendingByPeerId((current) => ({ ...current, [peerUserId]: true }));
    stopTyping(peerUserId);

    try {
      const attachments = await Promise.all(
        pendingFiles.map(async (file) => {
          const uploadResponse = await uploadFile(file);
          const uploadedFile = uploadResponse.data;

          return {
            url: uploadedFile?.url || "",
            name: uploadedFile?.name || file.name,
            mimeType: uploadedFile?.mimeType || file.type || undefined,
            size: uploadedFile?.size || file.size || undefined,
          } satisfies ChatAttachmentMetadata;
        }),
      );

      const payloadContent = buildMessagePayload({
        text: content,
        attachments: attachments.filter((item) => item.url && item.name),
        reply: replyTarget
          ? {
              messageId: replyTarget.messageId,
              senderId: replyTarget.senderId,
              author: replyTarget.author,
              text: replyTarget.text,
            }
          : undefined,
      });

      const sentMessage = isGeneralRoom(peerUserId)
        ? await sendGeneralRoomMessage({
            roomId: GENERAL_ROOM_ID,
            content: payloadContent,
          })
        : await sendMessageMutation.mutateAsync({
            peerUserId,
            content: payloadContent,
          });
      const normalizedMessage = normalizeChatMessage(sentMessage);
      const finalMessage = {
        ...normalizedMessage,
        content:
          replyTarget && !hasReplyInContent(normalizedMessage.content)
            ? payloadContent
            : normalizedMessage.content,
        peerUserId,
        roomId: isGeneralRoom(peerUserId)
          ? GENERAL_ROOM_ID
          : normalizedMessage.roomId,
        roomName: isGeneralRoom(peerUserId)
          ? GENERAL_ROOM_NAME
          : normalizedMessage.roomName,
      };
      const peerUser = getPeerUser(peerUserId);

      setMessagesByPeerId((current) => ({
        ...current,
        [peerUserId]: mergeMessages(current[peerUserId], finalMessage),
      }));

      queryClient.setQueryData<ChatMessage[]>(
        isGeneralRoom(peerUserId)
          ? queryKeys.chat.roomMessages(GENERAL_ROOM_ID)
          : queryKeys.chat.messages(peerUserId),
        (current) => mergeMessages(current, finalMessage),
      );

      if (!isGeneralRoom(peerUserId)) {
        queryClient.setQueryData<ChatConversation[]>(
          queryKeys.chat.conversations(),
          (current) =>
            updateConversationForMessage(
              current,
              peerUserId,
              peerUser,
              finalMessage,
              true,
              true,
            ),
        );
      }

      setDraftByPeerId((current) => ({ ...current, [peerUserId]: "" }));
      setReplyByPeerId((current) => ({ ...current, [peerUserId]: undefined }));
      setPendingFilesByPeerId((current) => ({ ...current, [peerUserId]: [] }));
      scheduleScrollToBottom(peerUserId);
    } catch {
      message.error("Failed to send message");
    } finally {
      setSendingByPeerId((current) => ({ ...current, [peerUserId]: false }));
      focusComposerInput(peerUserId);
    }
  };

  useEffect(() => {
    for (const [peerUserId, draft] of Object.entries(draftByPeerId)) {
      const trimmed = draft.trim();
      if (!trimmed) {
        stopTyping(peerUserId);
        continue;
      }

      announceTypingIfNeeded(peerUserId);
      clearTypingStopTimer(peerUserId);
      typingStopTimersRef.current[peerUserId] = setTimeout(() => {
        outgoingTypingSentAtRef.current[peerUserId] = 0;
        void sendTypingState(peerUserId, false);
      }, CHAT_TYPING_IDLE_MS);
    }

    return () => {
      for (const peerUserId of Object.keys(typingStopTimersRef.current)) {
        if (!(peerUserId in draftByPeerId)) {
          clearTypingStopTimer(peerUserId);
        }
      }
    };
  }, [draftByPeerId]);

  useEffect(
    () => () => {
      for (const timer of Object.values(typingStopTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
      for (const timer of Object.values(typingReceiveTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
      for (const timer of Object.values(incomingAnimationTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
      for (const timer of Object.values(jumpHighlightTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
      for (const timer of Object.values(jumpVisibilityTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    },
    [],
  );

  useEffect(() => {
    for (const window of visibleWindows) {
      const peerUserId = window.peerUserId;
      if (pendingBottomScrollByPeerIdRef.current[peerUserId]) {
        const body = messageBodyRefs.current[peerUserId];
        if (body) {
          scrollRestoreByPeerIdRef.current[peerUserId] = null;
          body.scrollTop = body.scrollHeight;
          pendingBottomScrollByPeerIdRef.current[peerUserId] = false;
          updateScrollToLatestVisibility(peerUserId);
        }
        continue;
      }

      if (scrollRestoreByPeerIdRef.current[peerUserId]) {
        restoreScrollPosition(peerUserId);
      }

      updateScrollToLatestVisibility(peerUserId);
    }
  }, [messagesByPeerId, visibleWindows]);

  useEffect(() => {
    if (!didRestoreWindows) {
      return;
    }

    for (const window of visibleWindows) {
      const peerUserId = window.peerUserId;
      const hasMessages = Array.isArray(messagesByPeerId[peerUserId]);
      const isLoading = Boolean(loadingByPeerId[peerUserId]);
      if (!hasMessages && !isLoading) {
        void loadMessages(peerUserId);
      }
    }
  }, [didRestoreWindows, loadingByPeerId, messagesByPeerId, visibleWindows]);

  useEffect(() => {
    for (const window of visibleWindows) {
      const peerUserId = window.peerUserId;
      if (isGeneralRoom(peerUserId)) {
        continue;
      }
      const unreadCount =
        conversationByPeerId.get(peerUserId)?.unreadCount || 0;
      if (unreadCount <= 0 || markReadInFlightRef.current.has(peerUserId)) {
        continue;
      }

      markReadInFlightRef.current.add(peerUserId);
      markReadMutation.mutate(
        { peerUserId },
        {
          onSuccess: () => setPeerUnreadZero(peerUserId),
          onSettled: () => {
            markReadInFlightRef.current.delete(peerUserId);
          },
        },
      );
    }
  }, [conversationByPeerId, markReadMutation, visibleWindows]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleSocketMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = camelcaseKeys(parsed, { deep: true }) as any;
        const eventName = payload?.event || payload?.type;
        const rawPayloadData = payload?.data || payload;
        const rawEventData =
          rawPayloadData?.event === "chat:new-message" && rawPayloadData?.data
            ? rawPayloadData.data
            : rawPayloadData?.payload || rawPayloadData;

        if (
          eventName === "chat:presence-sync" ||
          eventName === "chat:presence-update"
        ) {
          const presenceSource =
            rawPayloadData?.data ||
            rawEventData?.data ||
            rawEventData?.presence ||
            rawEventData?.users ||
            rawEventData?.presences ||
            rawEventData;
          const updates = extractPresenceUpdates(presenceSource);
          mergePresenceUpdates(updates, eventName === "chat:presence-sync");
          return;
        }

        if (eventName === "chat:messages-read") {
          const readerUserId = resolvePresenceUserId(rawEventData);
          const peerUserId = resolveChatPeerUserId(rawEventData, currentUserId);
          const messageIds = Array.isArray(rawEventData?.messageIds)
            ? rawEventData.messageIds
            : Array.isArray(rawEventData?.message_ids)
              ? rawEventData.message_ids
              : Array.isArray(rawEventData?.ids)
                ? rawEventData.ids
                : [];

          if (!peerUserId || readerUserId === currentUserId) {
            return;
          }

          updateReadReceiptState(peerUserId, messageIds);
          return;
        }

        if (eventName === "chat:reaction-update") {
          const messageId =
            rawEventData?.messageId ||
            rawEventData?.message_id ||
            rawPayloadData?.messageId ||
            rawPayloadData?.message_id;
          const reactions =
            rawEventData?.reactions || rawPayloadData?.reactions || [];

          if (messageId) {
            applyReactionsToCaches(String(messageId), reactions);
          }
          return;
        }

        if (eventName === "chat:reaction-activity" || eventName === "chat:reaction-notification") {
          const reactorName =
            rawEventData?.reactorName || rawEventData?.reactor_name || "Someone";
          const emoji = rawEventData?.emoji || "";
          const action = rawEventData?.action === "removed" ? "removed" : "reacted";
          const roomId = rawEventData?.roomId || rawEventData?.room_id;
          const peerUserId =
            roomId === GENERAL_ROOM_ID
              ? GENERAL_ROOM_ID
              : rawEventData?.peerUserId ||
                rawEventData?.peer_user_id ||
                resolveChatPeerUserId(rawEventData, currentUserId);

          const activityText = `${reactorName} ${action} ${emoji} to your message`;

          if (peerUserId === GENERAL_ROOM_ID) {
            setGeneralLastActivity(activityText);

            const existingWindow = chatWindowsRef.current.find(
              (window) => window.peerUserId === GENERAL_ROOM_ID,
            );
            const isOpenAndActive = Boolean(existingWindow && !existingWindow.minimized);
            if (eventName === "chat:reaction-notification" && !isOpenAndActive) {
              setRoomUnreadById((current) => ({
                ...current,
                [GENERAL_ROOM_ID]: (current[GENERAL_ROOM_ID] || 0) + 1,
              }));
            }
            return;
          }

          if (!peerUserId) {
            return;
          }

          const existingWindow = chatWindowsRef.current.find(
            (window) => window.peerUserId === peerUserId,
          );
          const isOpenAndActive = Boolean(existingWindow && !existingWindow.minimized);
          const peerUser = getPeerUser(peerUserId);
          const isOwnActivity = eventName !== "chat:reaction-notification";

          const syntheticMessage: ChatMessage = {
            id: `reaction-activity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            peerUserId,
            senderId: peerUserId,
            recipientId: currentUserId || "",
            content: activityText,
            isRead: isOpenAndActive,
            createdAt: new Date().toISOString(),
          };

          queryClient.setQueryData<ChatConversation[]>(
            queryKeys.chat.conversations(),
            (current) =>
              updateConversationForMessage(
                current,
                peerUserId,
                peerUser,
                syntheticMessage,
                isOwnActivity,
                isOpenAndActive,
              ),
          );
          return;
        }

        if (eventName === "chat:typing") {
          const typingEventData = resolveTypingPayloadData(rawEventData);
          const roomId =
            typingEventData?.roomId ||
            typingEventData?.room_id ||
            rawPayloadData?.roomId ||
            rawPayloadData?.room_id;

          if (roomId === GENERAL_ROOM_ID) {
            const senderUserId =
              typingEventData?.senderUserId ||
              typingEventData?.sender_user_id ||
              typingEventData?.senderId ||
              typingEventData?.sender_id;
            const isTyping = Boolean(
              typingEventData?.isTyping ??
                typingEventData?.is_typing ??
                typingEventData?.typing ??
                false,
            );

            if (!senderUserId || senderUserId === currentUserId) {
              return;
            }

            clearTypingReceiveTimer(GENERAL_ROOM_ID);
            if (!isTyping) {
              setTypingState(GENERAL_ROOM_ID, false);
              return;
            }

            setTypingState(GENERAL_ROOM_ID, true);
            scheduleScrollToBottom(GENERAL_ROOM_ID);
            typingReceiveTimersRef.current[GENERAL_ROOM_ID] = setTimeout(() => {
              setTypingState(GENERAL_ROOM_ID, false);
              typingReceiveTimersRef.current[GENERAL_ROOM_ID] = null;
            }, CHAT_PRESENCE_TIMEOUT_MS);
            return;
          }

          const senderUserId =
            typingEventData?.senderUserId ||
            typingEventData?.sender_user_id ||
            typingEventData?.senderId ||
            typingEventData?.sender_id ||
            typingEventData?.userId ||
            typingEventData?.user_id ||
            typingEventData?.fromUserId ||
            typingEventData?.from_user_id;
          const recipientUserId =
            typingEventData?.recipientUserId ||
            typingEventData?.recipient_user_id ||
            typingEventData?.recipientId ||
            typingEventData?.recipient_id ||
            rawPayloadData?.recipientUserId ||
            rawPayloadData?.recipient_user_id ||
            rawPayloadData?.recipientId ||
            rawPayloadData?.recipient_id;
          const peerFromPayload =
            resolveChatPeerUserId(typingEventData, currentUserId) ||
            resolveChatPeerUserId(rawPayloadData, currentUserId);
          const isTyping = Boolean(
            typingEventData?.isTyping ??
              typingEventData?.is_typing ??
              typingEventData?.typing ??
              false,
          );
          const peerUserId = senderUserId || peerFromPayload;

          if (!peerUserId || peerUserId === currentUserId) {
            return;
          }

          if (recipientUserId && currentUserId && recipientUserId !== currentUserId) {
            return;
          }

          clearTypingReceiveTimer(peerUserId);
          if (!isTyping) {
            setTypingState(peerUserId, false);
            return;
          }

          setTypingState(peerUserId, true);
          scheduleScrollToBottom(peerUserId);
          typingReceiveTimersRef.current[peerUserId] = setTimeout(() => {
            setTypingState(peerUserId, false);
            typingReceiveTimersRef.current[peerUserId] = null;
          }, CHAT_PRESENCE_TIMEOUT_MS);
          return;
        }

        if (eventName === "chat:group-mention") {
          const roomId =
            rawEventData?.roomId ||
            rawEventData?.room_id ||
            GENERAL_ROOM_ID;

          if (roomId === GENERAL_ROOM_ID) {
            const existingWindow = chatWindowsRef.current.find(
              (window) => window.peerUserId === GENERAL_ROOM_ID,
            );
            const isOpenAndActive = Boolean(
              existingWindow && !existingWindow.minimized,
            );
            if (!isOpenAndActive) {
              setRoomMentionById((current) => ({
                ...current,
                [GENERAL_ROOM_ID]: true,
              }));
            }
          }
          return;
        }

        if (eventName === "chat:room-message") {
          const rawMessage =
            rawEventData?.message && typeof rawEventData.message === "object"
              ? rawEventData.message
              : rawEventData?.data?.message &&
                  typeof rawEventData.data.message === "object"
                ? rawEventData.data.message
                : rawEventData;
          const normalizedMessage = normalizeChatMessage(rawMessage);
          const peerUserId = GENERAL_ROOM_ID;
          const completedMessage: ChatMessage = {
            ...normalizedMessage,
            id:
              normalizedMessage.id ||
              rawMessage?.id ||
              rawMessage?.messageId ||
              rawMessage?.message_id ||
              rawEventData?.id ||
              rawEventData?.messageId ||
              rawEventData?.message_id ||
              rawEventData?.message?.id ||
              rawEventData?.message?.messageId ||
              rawEventData?.message?.message_id ||
              `ws-general-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            peerUserId,
            roomId: normalizedMessage.roomId || GENERAL_ROOM_ID,
            roomName: normalizedMessage.roomName || GENERAL_ROOM_NAME,
            senderId:
              normalizedMessage.senderId ||
              rawEventData?.sender?.id ||
              rawEventData?.senderId ||
              rawEventData?.sender_id ||
              "",
            content:
              normalizedMessage.content ||
              (typeof rawEventData?.message === "string"
                ? rawEventData.message
                : typeof rawEventData?.content === "string"
                  ? rawEventData.content
                  : ""),
            createdAt:
              normalizedMessage.createdAt ||
              rawEventData?.createdAt ||
              rawEventData?.created_at ||
              new Date().toISOString(),
          };
          const incomingKey = getIncomingMessageKey(peerUserId, completedMessage);
          if (processedIncomingMessageKeysRef.current.has(incomingKey)) {
            return;
          }
          processedIncomingMessageKeysRef.current.add(incomingKey);
          if (processedIncomingMessageKeysRef.current.size > 5000) {
            processedIncomingMessageKeysRef.current.clear();
          }

          const existingMessages = messagesByPeerIdRef.current[peerUserId] || [];
          const alreadyExists = Boolean(
            completedMessage.id &&
              existingMessages.some((item) => item.id === completedMessage.id),
          );
          if (alreadyExists) {
            return;
          }

          const isOwnMessage =
            Boolean(currentUserId) && completedMessage.senderId === currentUserId;
          const existingWindow = chatWindowsRef.current.find(
            (window) => window.peerUserId === peerUserId,
          );
          const isOpenAndActive = Boolean(existingWindow && !existingWindow.minimized);

          setMessagesByPeerId((current) => ({
            ...current,
            [peerUserId]: mergeMessages(current[peerUserId], completedMessage),
          }));

          queryClient.setQueryData<ChatMessage[]>(
            queryKeys.chat.roomMessages(GENERAL_ROOM_ID),
            (current) => mergeMessages(current, completedMessage),
          );

          if (!isOwnMessage && !isOpenAndActive) {
            setRoomUnreadById((current) => ({
              ...current,
              [GENERAL_ROOM_ID]: (current[GENERAL_ROOM_ID] || 0) + 1,
            }));
            if (messageMentionsCurrentUser(completedMessage, currentUser)) {
              setRoomMentionById((current) => ({
                ...current,
                [GENERAL_ROOM_ID]: true,
              }));
            }
          }

          if (!isOwnMessage && !existingWindow) {
            setChatWindows((current) =>
              upsertWindow(current, peerUserId, {
                minimized: true,
                openedAt: Date.now(),
              }),
            );
          }

          if (!isOwnMessage) {
            playIncomingMessageSound();
            if (isOpenAndActive) {
              markIncomingMessageAnimated(completedMessage.id);
            }
            if (!isOpenAndActive) {
              const senderName =
                rawEventData?.sender?.name ||
                (completedMessage as any).sender?.name ||
                "General";
              const content =
                summarizeChatToastContent(completedMessage.content || "") ||
                "(Attachment)";
              window.dispatchEvent(
                new CustomEvent("chat:toast", {
                  detail: { peerUserId: GENERAL_ROOM_ID, senderName, content },
                }),
              );
            }
          }

          scheduleScrollToBottom(peerUserId);

          return;
        }

        if (eventName !== "chat:new-message") {
          return;
        }

        const rawMessage =
          rawEventData?.message && typeof rawEventData.message === "object"
            ? rawEventData.message
            : rawEventData?.data?.message &&
                typeof rawEventData.data.message === "object"
              ? rawEventData.data.message
              : rawEventData;
        const normalizedMessage = normalizeChatMessage(rawMessage);
        let peerUserId = resolvePeerUserId(
          normalizedMessage,
          currentUserId,
          rawEventData,
        );

        if (!peerUserId && chatWindowsRef.current.length === 1) {
          peerUserId = chatWindowsRef.current[0].peerUserId;
        }

        if (!peerUserId) {
          return;
        }

        const completedMessage: ChatMessage = {
          ...normalizedMessage,
          id:
            normalizedMessage.id ||
            rawMessage?.id ||
            rawMessage?.messageId ||
            rawMessage?.message_id ||
            rawEventData?.id ||
            rawEventData?.messageId ||
            rawEventData?.message_id ||
            rawEventData?.message?.id ||
            rawEventData?.message?.messageId ||
            rawEventData?.message?.message_id ||
            `ws-${peerUserId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          senderId:
            normalizedMessage.senderId ||
            rawEventData?.sender?.id ||
            rawEventData?.senderId ||
            rawEventData?.sender_id ||
            rawEventData?.message?.senderId ||
            rawEventData?.message?.sender_id ||
            "",
          recipientId:
            normalizedMessage.recipientId ||
            rawEventData?.recipient?.id ||
            rawEventData?.recipientId ||
            rawEventData?.recipient_id ||
            rawEventData?.message?.recipientId ||
            rawEventData?.message?.recipient_id ||
            "",
          content:
            normalizedMessage.content ||
            (typeof rawEventData?.message === "string"
              ? rawEventData.message
              : typeof rawEventData?.content === "string"
                ? rawEventData.content
                : ""),
          createdAt:
            normalizedMessage.createdAt ||
            rawEventData?.createdAt ||
            rawEventData?.created_at ||
            new Date().toISOString(),
        };
        const incomingKey = getIncomingMessageKey(peerUserId, completedMessage);
        if (processedIncomingMessageKeysRef.current.has(incomingKey)) {
          return;
        }
        processedIncomingMessageKeysRef.current.add(incomingKey);
        if (processedIncomingMessageKeysRef.current.size > 5000) {
          processedIncomingMessageKeysRef.current.clear();
        }

        const existingMessages = messagesByPeerIdRef.current[peerUserId] || [];
        const alreadyExists = Boolean(
          completedMessage.id &&
            existingMessages.some((item) => item.id === completedMessage.id),
        );
        if (alreadyExists) {
          return;
        }

        const isOwnMessage =
          Boolean(currentUserId) && completedMessage.senderId === currentUserId;
        const peerUser =
          resolvePeerUser(completedMessage, rawEventData, currentUserId) ||
          getPeerUser(peerUserId);

        const existingWindow = chatWindowsRef.current.find(
          (window) => window.peerUserId === peerUserId,
        );
        const isOpenAndActive = Boolean(existingWindow && !existingWindow.minimized);

        const finalMessage = {
          ...completedMessage,
          peerUserId,
        };

        setMessagesByPeerId((current) => ({
          ...current,
          [peerUserId]: mergeMessages(current[peerUserId], finalMessage),
        }));

        queryClient.setQueryData<ChatMessage[]>(
          queryKeys.chat.messages(peerUserId),
          (current) => mergeMessages(current, finalMessage),
        );

        queryClient.setQueryData<ChatConversation[]>(
          queryKeys.chat.conversations(),
          (current) =>
            updateConversationForMessage(
              current,
              peerUserId,
              peerUser,
              finalMessage,
              isOwnMessage,
              isOpenAndActive,
            ),
        );

        if (!isOwnMessage && !existingWindow) {
          setChatWindows((current) =>
            upsertWindow(current, peerUserId, {
              minimized: true,
              openedAt: Date.now(),
            }),
          );
        }

        if (!isOwnMessage && isOpenAndActive && !isGeneralRoom(peerUserId)) {
          markReadMutation.mutate(
            { peerUserId },
            {
              onSuccess: () => setPeerUnreadZero(peerUserId),
            },
          );
        }

        if (!isOwnMessage) {
          playIncomingMessageSound();
          if (isOpenAndActive) {
            markIncomingMessageAnimated(finalMessage.id);
          }
          if (
            isGeneralRoom(peerUserId) &&
            !isOpenAndActive &&
            messageMentionsCurrentUser(finalMessage, currentUser)
          ) {
            setRoomMentionById((current) => ({
              ...current,
              [GENERAL_ROOM_ID]: true,
            }));
          }
          if (!isOpenAndActive) {
            const senderName = peerUser?.name || "Someone";
            const content =
              summarizeChatToastContent(finalMessage.content || "") ||
              "(Attachment)";
            window.dispatchEvent(
              new CustomEvent("chat:toast", {
                detail: { peerUserId, senderName, content },
              }),
            );
          }
        }

        scheduleScrollToBottom(peerUserId);
      } catch (error) {
        console.error("[CHAT] Failed to process websocket message", error);
      }
    };

    socket.addEventListener("message", handleSocketMessage);
    return () => socket.removeEventListener("message", handleSocketMessage);
  }, [currentUser, currentUserId, markReadMutation, queryClient, socket]);

  return (
    <>
      <div className={styles.windowRail}>
        {visibleWindows.map((window) => {
          const peerUser = getPeerUser(window.peerUserId);
          const messages = messagesByPeerId[window.peerUserId] || [];
          const isLoading = Boolean(loadingByPeerId[window.peerUserId]);
          const isLoadingOlder = Boolean(
            loadingOlderByPeerId[window.peerUserId],
          );
          const hasMoreMessages = Boolean(
            hasMoreMessagesByPeerId[window.peerUserId],
          );
          const unreadCount =
            isGeneralRoom(window.peerUserId)
              ? roomUnreadById[GENERAL_ROOM_ID] || 0
              : conversationByPeerId.get(window.peerUserId)?.unreadCount || 0;
          const headerBadgeCount =
            isGeneralRoom(window.peerUserId) && isGeneralMentionActive
              ? "@"
              : unreadCount;
          const roleLabel = getRoleLabel(peerUser);
          const draft = draftByPeerId[window.peerUserId] || "";
          const replyTarget = replyByPeerId[window.peerUserId];
          const pendingFiles = pendingFilesByPeerId[window.peerUserId] || [];
          const sendingThisPeer = Boolean(sendingByPeerId[window.peerUserId]);
          const isDragOver = Boolean(isDragOverByPeerId[window.peerUserId]);
          const canSend = Boolean(draft.trim() || pendingFiles.length > 0);
          const peerTyping = Boolean(typingByUserId[window.peerUserId]);
          const mentionQuery = isGeneralRoom(window.peerUserId)
            ? extractMentionQuery(draft)
            : null;
          const mentionSuggestions =
            isGeneralRoom(window.peerUserId) && mentionQuery !== null
              ? generalMentionUsers
                  .filter((user) => {
                    const username = user.username || "";
                    const name = user.name || "";
                    const handle = getMentionHandle(user);
                    const query = mentionQuery.toLowerCase().trim();
                    if (!query) {
                      return true;
                    }
                    return (
                      handle.toLowerCase().includes(query) ||
                      username.toLowerCase().includes(query) ||
                      name.toLowerCase().includes(query)
                    );
                  })
                  .slice(0, 6)
              : [];

          return (
            <div
              key={window.peerUserId}
              className={`${styles.chatWindow} ${
                isDragOver ? styles.chatWindowDragOver : ""
              }`}
              onDragOver={(event) => {
                if (!isFileDragEvent(event)) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setIsDragOverByPeerId((current) => ({
                  ...current,
                  [window.peerUserId]: true,
                }));
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsDragOverByPeerId((current) => ({
                    ...current,
                    [window.peerUserId]: false,
                  }));
                }
              }}
              onDrop={(event) =>
                handleComposerDrop(window.peerUserId, event)
              }
            >
              <div className={styles.chatWindowHeader}>
                <div className={styles.chatWindowPeer}>
                  {renderPresenceAvatar(
                    peerUser,
                    getPeerPresenceStatus(window.peerUserId),
                    28,
                    styles.peerAvatar,
                  )}
                  <div className={styles.peerHeaderText}>
                    <Text className={styles.peerName}>{peerUser.name}</Text>
                    {roleLabel ? (
                      <Text className={styles.peerRoleText}>{roleLabel}</Text>
                    ) : null}
                  </div>
                  {headerBadgeCount ? (
                    <Badge
                      count={headerBadgeCount}
                      className={styles.headerBadge}
                      overflowCount={9}
                    />
                  ) : null}
                </div>
                <div className={styles.chatWindowActions}>
                  <Button
                    type="text"
                    size="small"
                    icon={<MinusOutlined />}
                    onClick={() => minimizeWindow(window.peerUserId)}
                    className={styles.headerButton}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => closeWindow(window.peerUserId)}
                    className={styles.headerButton}
                  />
                </div>
              </div>

              <div
                ref={(element) => {
                  messageBodyRefs.current[window.peerUserId] = element;
                }}
                className={styles.chatWindowBody}
                onScroll={(event) => {
                  updateScrollToLatestVisibility(window.peerUserId);

                  if (!hasMoreMessages || isLoadingOlder) {
                    return;
                  }

                  const target = event.currentTarget;
                  if (target.scrollTop <= 48) {
                    void loadOlderMessages(window.peerUserId);
                  }
                }}
              >
                {messages.length > 0 && hasMoreMessages ? (
                  <div className={styles.loadOlderRow}>
                    {isLoadingOlder ? (
                      <Spin size="small" />
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        className={styles.loadOlderButton}
                        onClick={() => void loadOlderMessages(window.peerUserId)}
                      >
                        Load older messages
                      </Button>
                    )}
                  </div>
                ) : null}
                {isLoading ? (
                  <div className={styles.windowEmpty}>
                    <Spin size="small" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.windowEmpty}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No messages"
                    />
                  </div>
                ) : (
                  messages.map((chatMessage) => {
                    const isOwnMessage =
                      Boolean(currentUserId) &&
                      chatMessage.senderId === currentUserId;
                    const shouldShowGroupSenderName =
                      isGeneralRoom(window.peerUserId) && !isOwnMessage;
                    const groupSenderName = shouldShowGroupSenderName
                      ? chatMessage.sender?.name ||
                        chatMessage.sender?.username ||
                        userById.get(chatMessage.senderId || "")?.name ||
                        userById.get(chatMessage.senderId || "")?.username ||
                        "Unknown"
                      : "";
                    const parsedMessage = parseMessagePayload(chatMessage.content || "");
                    const attachments = parsedMessage.attachments;
                    const parsedReply = parsedMessage.reply;
                    const deliveryLabel = isOwnMessage
                      ? getMessageDeliveryLabel(chatMessage, window.peerUserId)
                      : "";
                    const showsDeliveryCheck =
                      deliveryLabel === "Delivered" || deliveryLabel === "Seen";
                    const deliveryStatusClass =
                      deliveryLabel === "Seen"
                        ? styles.messageStatusSeen
                        : styles.messageStatusDelivered;

                    return (
                      <div
                        key={chatMessage.id}
                        ref={(element) => {
                          const peerNodes =
                            messageNodeByPeerIdRef.current[window.peerUserId] || {};
                          if (chatMessage.id) {
                            peerNodes[chatMessage.id] = element;
                          }
                          messageNodeByPeerIdRef.current[window.peerUserId] = peerNodes;
                        }}
                        className={`${styles.messageRow} ${
                          isOwnMessage ? styles.messageRowOwn : ""
                        }`}
                      >
                        <div
                          className={styles.messageBubbleWrapper}
                          onMouseEnter={() => setHoveredMessageId(chatMessage.id)}
                          onMouseLeave={() =>
                            setHoveredMessageId((current) =>
                              current === chatMessage.id ? null : current,
                            )
                          }
                        >
                          <div
                            className={`${styles.messageBubble} ${
                              isOwnMessage ? styles.messageBubbleOwn : ""
                            } ${
                              chatMessage.reactions && chatMessage.reactions.length > 0
                                ? styles.messageBubbleWithReactions
                                : ""
                            } ${
                              !isOwnMessage && incomingAnimatedByMessageId[chatMessage.id]
                                ? styles.messageBubbleIncomingAnimated
                                : ""
                            } ${
                              jumpHighlightedByMessageId[chatMessage.id]
                                ? isOwnMessage
                                  ? styles.messageBubbleOwnJumpHighlighted
                                  : styles.messageBubbleJumpHighlighted
                                : ""
                            }`}
                          >
                          {shouldShowGroupSenderName ? (
                            <div className={styles.groupSenderName}>{groupSenderName}</div>
                          ) : null}
                          <div className={styles.messageText}>
                            {parsedReply ? (
                              <>
                                {parsedReply.messageId ? (
                                  <button
                                    type="button"
                                    className={`${styles.quotedReply} ${
                                      isOwnMessage ? styles.quotedReplyOwn : ""
                                    } ${styles.quotedReplyClickable}`}
                                    onClick={() =>
                                      jumpToRepliedMessage(
                                        window.peerUserId,
                                        parsedReply.messageId,
                                        parsedReply.author,
                                        parsedReply.text,
                                      )
                                    }
                                  >
                                    <div className={styles.quotedReplyAuthor}>
                                      {parsedReply.author}
                                    </div>
                                    <div className={styles.quotedReplyText}>
                                      {renderMessageContent(parsedReply.text)}
                                    </div>
                                  </button>
                                ) : (
                                  <div
                                    className={`${styles.quotedReply} ${
                                      isOwnMessage ? styles.quotedReplyOwn : ""
                                    }`}
                                  >
                                    <div className={styles.quotedReplyAuthor}>
                                      {parsedReply.author}
                                    </div>
                                    <div className={styles.quotedReplyText}>
                                      {renderMessageContent(parsedReply.text)}
                                    </div>
                                  </div>
                                )}
                                {parsedMessage.text ? (
                                  <div>{renderMessageContent(parsedMessage.text)}</div>
                                ) : null}
                              </>
                            ) : parsedMessage.text ? (
                              renderMessageContent(parsedMessage.text)
                            ) : null}
                            {attachments.length > 0 ? (
                              <div className={styles.attachmentList}>
                                {attachments.map((attachment) =>
                                  isImageAttachment(attachment) ? (
                                    <button
                                      key={`${chatMessage.id}-${attachment.url}`}
                                      type="button"
                                      className={styles.imageAttachmentButton}
                                      onClick={() =>
                                        openAttachmentPreview(
                                          chatMessage,
                                          attachments,
                                          attachments.findIndex(
                                            (item) => item.url === attachment.url,
                                          ),
                                        )
                                      }
                                    >
                                      <Image
                                        src={attachment.url}
                                        alt={attachment.name}
                                        preview={false}
                                        className={styles.imageAttachment}
                                      />
                                      <span className={styles.imageAttachmentName}>
                                        {attachment.name}
                                      </span>
                                    </button>
                                  ) : isPreviewableAttachment(attachment) ? (
                                    <button
                                      key={`${chatMessage.id}-${attachment.url}`}
                                      type="button"
                                      className={styles.fileAttachment}
                                      onClick={() =>
                                        openAttachmentPreview(
                                          chatMessage,
                                          attachments,
                                          attachments.findIndex(
                                            (item) => item.url === attachment.url,
                                          ),
                                        )
                                      }
                                    >
                                      <LinkOutlined />
                                      <span className={styles.fileAttachmentName}>
                                        {attachment.name}
                                      </span>
                                      {attachment.size ? (
                                        <span className={styles.fileAttachmentMeta}>
                                          {formatAttachmentSize(attachment.size)}
                                        </span>
                                      ) : null}
                                    </button>
                                  ) : (
                                    <a
                                      key={`${chatMessage.id}-${attachment.url}`}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.fileAttachment}
                                    >
                                      <LinkOutlined />
                                      <span className={styles.fileAttachmentName}>
                                        {attachment.name}
                                      </span>
                                      {attachment.size ? (
                                        <span className={styles.fileAttachmentMeta}>
                                          {formatAttachmentSize(attachment.size)}
                                        </span>
                                      ) : null}
                                    </a>
                                  ),
                                )}
                              </div>
                            ) : null}
                          </div>
                          {chatMessage.reactions && chatMessage.reactions.length > 0 ? (
                            <div className={styles.reactionBadges}>
                              {chatMessage.reactions.map((reaction) => {
                                const hasReacted = reaction.userIds.includes(
                                  currentUserId || "",
                                );
                                const reactorNames = reaction.userIds.map((uid) => {
                                  if (uid === currentUserId) return "You";
                                  const user = userById.get(uid);
                                  return user?.name || user?.username || "Unknown";
                                });
                                return (
                                  <Tooltip
                                    key={reaction.emoji}
                                    title={reactorNames.map((name, i) => (
                                      <div key={i}>{name}</div>
                                    ))}
                                    placement="top"
                                    mouseEnterDelay={0.3}
                                    zIndex={1500}
                                  >
                                    <button
                                      className={`${styles.reactionBadge} ${
                                        hasReacted ? styles.reactionBadgeActive : ""
                                      }`}
                                      onClick={() => {
                                        if (hasReacted) {
                                          void removeReaction(chatMessage.id, reaction.emoji);
                                        } else {
                                          void addReaction(chatMessage.id, reaction.emoji);
                                        }
                                      }}
                                    >
                                      {reaction.emoji}{reaction.count > 1 ? ` ${reaction.count}` : ""}
                                    </button>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          ) : null}
                          <div className={styles.messageMetaRow}>
                            <div className={styles.messageMetaInfo}>
                              <div className={styles.messageTime}>
                                {formatTime(chatMessage.createdAt)}
                              </div>
                              {isOwnMessage ? (
                                <div
                                  className={`${styles.messageStatus} ${
                                    showsDeliveryCheck ? deliveryStatusClass : ""
                                  }`}
                                >
                                  {showsDeliveryCheck ? (
                                    <span className={styles.messageStatusCheckIcon}>✓</span>
                                  ) : (
                                    deliveryLabel
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <Button
                              type="text"
                              size="small"
                              className={styles.replyButton}
                              onClick={() =>
                                setReplyByPeerId((current) => ({
                                  ...current,
                                  [window.peerUserId]: {
                                    messageId: chatMessage.id,
                                    senderId: chatMessage.senderId,
                                    author: isOwnMessage
                                      ? currentUser?.username || currentUser?.id || "Unknown"
                                      : isGeneralRoom(window.peerUserId)
                                        ? groupSenderName
                                        : peerUser.name,
                                    text: toReplySnippet(
                                      summarizeMessageContent(chatMessage.content || ""),
                                    ),
                                  },
                                }))
                              }
                            >
                              Reply
                            </Button>
                          </div>
                          {hoveredMessageId === chatMessage.id ? (
                            <button
                              data-reaction-trigger="true"
                              className={styles.reactionTrigger}
                              onClick={() => {
                                const closing = reactionPickerMessageId === chatMessage.id;
                                setReactionPickerMessageId(closing ? null : chatMessage.id);
                                if (closing) setReactionPickerExpanded(false);
                              }}
                            >
                              😊
                            </button>
                          ) : null}
                          {reactionPickerMessageId === chatMessage.id ? (
                            <div
                              data-reaction-picker="true"
                              className={`${styles.reactionPickerPopover} ${
                                isOwnMessage
                                  ? styles.reactionPickerPopoverOwn
                                  : styles.reactionPickerPopoverIncoming
                              }`}
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              {reactionPickerExpanded ? (
                                <Picker
                                  data={emojiData}
                                  onEmojiSelect={(emoji: { native: string }) => {
                                    void addReaction(chatMessage.id, emoji.native);
                                    setReactionPickerMessageId(null);
                                    setReactionPickerExpanded(false);
                                  }}
                                  theme="light"
                                  previewPosition="none"
                                  skinTonePosition="search"
                                  perLine={8}
                                  maxFrequentRows={2}
                                />
                              ) : (
                                <div className={styles.reactionPickerRow}>
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={`${chatMessage.id}-${emoji}`}
                                      type="button"
                                      className={styles.reactionEmojiOption}
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void addReaction(chatMessage.id, emoji);
                                        setReactionPickerMessageId(null);
                                      }}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    className={styles.reactionEmojiOption}
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setReactionPickerExpanded(true);
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {peerTyping ? (
                  <div className={styles.typingRow}>
                    <div className={styles.typingBubble}>
                      <TypingIndicator
                        label={
                          isGeneralRoom(window.peerUserId)
                            ? "Someone is typing..."
                            : `${peerUser.name} is typing...`
                        }
                      />
                    </div>
                  </div>
                ) : null}
                <div
                  ref={(element) => {
                    messageEndRefs.current[window.peerUserId] = element;
                  }}
                />
              </div>

              {showScrollToLatestByPeerId[window.peerUserId] ? (
                <Button
                  type="primary"
                  shape="circle"
                  size="small"
                  icon={<DownOutlined />}
                  className={styles.scrollToLatestButton}
                  onClick={() => scheduleScrollToBottom(window.peerUserId)}
                  aria-label="Scroll to latest messages"
                />
              ) : null}

              <div
                className={`${styles.chatWindowComposer} ${
                  isDragOver ? styles.chatWindowComposerDragOver : ""
                }`}
                onDragOver={(event) => {
                  if (!isFileDragEvent(event)) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setIsDragOverByPeerId((current) => ({
                    ...current,
                    [window.peerUserId]: true,
                  }));
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsDragOverByPeerId((current) => ({
                      ...current,
                      [window.peerUserId]: false,
                    }));
                  }
                }}
                onDrop={(event) => handleComposerDrop(window.peerUserId, event)}
              >
                {replyTarget ? (
                  <div className={styles.replyPreview}>
                    <div className={styles.replyPreviewContent}>
                      <Text className={styles.replyPreviewLabel}>Replying to</Text>
                      <Text className={styles.replyPreviewAuthor}>
                        {replyTarget.author}
                      </Text>
                      <Text className={styles.replyPreviewText}>
                        {replyTarget.text}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      className={styles.replyPreviewClose}
                      onClick={() =>
                        setReplyByPeerId((current) => ({
                          ...current,
                          [window.peerUserId]: undefined,
                        }))
                      }
                    />
                  </div>
                ) : null}
                {pendingFiles.length > 0 ? (
                  <div className={styles.pendingAttachmentList}>
                    {pendingFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        className={styles.pendingAttachment}
                      >
                        <div className={styles.pendingAttachmentContent}>
                          <Text className={styles.pendingAttachmentName}>
                            {file.name}
                          </Text>
                          <Text className={styles.pendingAttachmentMeta}>
                            {formatAttachmentSize(file.size)}
                          </Text>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          className={styles.pendingAttachmentRemove}
                          onClick={() => removePendingFile(window.peerUserId, index)}
                          disabled={sendingThisPeer}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                {sendingThisPeer && pendingFiles.length > 0 ? (
                  <Text className={styles.uploadingText}>
                    Uploading {pendingFiles.length} file
                    {pendingFiles.length > 1 ? "s" : ""}...
                  </Text>
                ) : null}
                {isGeneralRoom(window.peerUserId) && mentionSuggestions.length > 0 ? (
                  <div className={styles.mentionDropdown}>
                    {mentionSuggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        className={styles.mentionOption}
                        onClick={() => {
                          const mentionHandle = getMentionHandle(candidate);
                          if (!mentionHandle) {
                            return;
                          }
                          setDraftByPeerId((current) => ({
                            ...current,
                            [window.peerUserId]: applyMentionSelection(
                              current[window.peerUserId] || "",
                              mentionHandle,
                            ),
                          }));
                        }}
                      >
                        <span className={styles.mentionOptionName}>
                          {candidate.name}
                        </span>
                        {candidate.roleName ? (
                          <span className={styles.mentionOptionMeta}>
                            {candidate.roleName}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className={styles.composerRow}>
                  <input
                    ref={(element) => {
                      fileInputRefs.current[window.peerUserId] = element;
                    }}
                    type="file"
                    multiple
                    hidden
                    onChange={(event) => handleFileSelection(window.peerUserId, event)}
                  />
                  <Button
                    type="text"
                    icon={<PaperClipOutlined />}
                    className={styles.attachButton}
                    onClick={() => fileInputRefs.current[window.peerUserId]?.click()}
                    disabled={sendingThisPeer}
                  />
                  <div className={styles.composerEmojiWrap}>
                    <Button
                      type="text"
                      className={styles.composerEmojiButton}
                      data-composer-trigger="true"
                      onClick={() =>
                        setComposerEmojiPickerPeerId((current) =>
                          current === window.peerUserId ? null : window.peerUserId,
                        )
                      }
                      disabled={sendingThisPeer}
                    >
                      😊
                    </Button>
                    {composerEmojiPickerPeerId === window.peerUserId ? (
                      <div
                        data-composer-picker="true"
                        className={styles.composerEmojiPopover}
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <div className={styles.composerEmojiDrawer}>
                          <Picker
                            data={emojiData}
                            onEmojiSelect={(emoji: { native: string }) => {
                              setDraftByPeerId((current) => ({
                                ...current,
                                [window.peerUserId]: `${current[window.peerUserId] || ""}${emoji.native}`,
                              }));
                            }}
                            theme="light"
                            previewPosition="none"
                            skinTonePosition="search"
                            perLine={7}
                            emojiSize={20}
                            emojiButtonSize={28}
                            maxFrequentRows={1}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <Input.TextArea
                    ref={(element) => {
                      composerInputRefs.current[window.peerUserId] = element;
                    }}
                    value={draft}
                    placeholder="Aa"
                    autoSize={{ minRows: 1, maxRows: 5 }}
                    onChange={(event) =>
                      setDraftByPeerId((current) => ({
                        ...current,
                        [window.peerUserId]: event.target.value,
                      }))
                    }
                    onPaste={(event) =>
                      handleComposerPaste(window.peerUserId, event)
                    }
                    onPressEnter={(event) => {
                      if (event.shiftKey) return;
                      if (
                        isGeneralRoom(window.peerUserId) &&
                        mentionSuggestions.length > 0
                      ) {
                        event.preventDefault();
                        event.stopPropagation();
                        const selected = mentionSuggestions[0];
                        const mentionHandle = getMentionHandle(selected);
                        if (!mentionHandle) {
                          return;
                        }
                        setDraftByPeerId((current) => ({
                          ...current,
                          [window.peerUserId]: applyMentionSelection(
                            current[window.peerUserId] || "",
                            mentionHandle,
                          ),
                        }));
                        return;
                      }

                      void handleSend(window.peerUserId);
                    }}
                    className={styles.composerInput}
                    disabled={sendingThisPeer}
                  />
                  <Button
                    type="text"
                    icon={<SendOutlined />}
                    onClick={() => void handleSend(window.peerUserId)}
                    className={styles.sendButton}
                    loading={sendingThisPeer}
                    disabled={!canSend}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.minimizedDock}>
        {isOverflowOpen && overflowMinimizedWindows.length > 0 ? (
          <div className={styles.overflowPanel}>
            <List
              dataSource={overflowMinimizedWindows}
              renderItem={(window) => {
                const peerUser = getPeerUser(window.peerUserId);
                const unreadCount =
                  isGeneralRoom(window.peerUserId)
                    ? roomUnreadById[GENERAL_ROOM_ID] || 0
                    : conversationByPeerId.get(window.peerUserId)?.unreadCount || 0;
                const mentionBadge =
                  isGeneralRoom(window.peerUserId) && isGeneralMentionActive
                    ? "@"
                    : unreadCount;

                return (
                  <List.Item
                    className={styles.overflowItem}
                    onClick={() => openWindow(window.peerUserId)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={mentionBadge} size="small" offset={[-2, 24]}>
                          {renderPresenceAvatar(
                            peerUser,
                            getPeerPresenceStatus(window.peerUserId),
                            32,
                          )}
                        </Badge>
                      }
                      title={
                        <Text className={styles.overflowName}>{peerUser.name}</Text>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        ) : null}

        {overflowMinimizedWindows.length > 0 ? (
          <Button
            shape="circle"
            className={styles.minimizedButton}
            onClick={() => setIsOverflowOpen((current) => !current)}
          >
            +{overflowMinimizedWindows.length}
          </Button>
        ) : null}

        {visibleMinimizedWindows.map((window) => {
          const peerUser = getPeerUser(window.peerUserId);
          const unreadCount =
            isGeneralRoom(window.peerUserId)
              ? roomUnreadById[GENERAL_ROOM_ID] || 0
              : conversationByPeerId.get(window.peerUserId)?.unreadCount || 0;
          const mentionBadge =
            isGeneralRoom(window.peerUserId) && isGeneralMentionActive
              ? "@"
              : unreadCount;

          return (
            <Badge
              key={window.peerUserId}
              count={mentionBadge}
              overflowCount={9}
              offset={[-2, 8]}
            >
              <Button
                shape="circle"
                className={styles.minimizedButton}
                onClick={() => openWindow(window.peerUserId)}
              >
                {renderPresenceAvatar(
                  peerUser,
                  getPeerPresenceStatus(window.peerUserId),
                  46,
                  styles.minimizedAvatar,
                )}
              </Button>
            </Badge>
          );
        })}

        {isComposerOpen ? (
          <div className={styles.composerPanel}>
            <div className={styles.composerHeader}>
              <Text className={styles.composerTitle}>New message</Text>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setIsComposerOpen(false)}
                className={styles.composerClose}
              />
            </div>

            <div className={styles.composerSearchRow}>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search people"
                allowClear
                prefix={<SearchOutlined />}
                className={styles.composerSearch}
              />
            </div>

            <div className={styles.peopleList}>
              {usersQuery.isLoading || conversationsQuery.isLoading ? (
                <div className={styles.windowEmpty}>
                  <Spin />
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className={styles.windowEmpty}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No people found"
                  />
                </div>
              ) : (
                <List
                  dataSource={filteredPeople}
                  renderItem={(entry) => {
                    const roleLabel = getRoleLabel(entry.peerUser);
                    const mentionBadge =
                      isGeneralRoom(entry.peerUserId) &&
                      isGeneralMentionActive
                        ? "@"
                        : entry.unreadCount;

                    return (
                      <List.Item
                        className={styles.peopleItem}
                        onClick={() => openWindow(entry.peerUserId)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge
                              count={mentionBadge}
                              overflowCount={9}
                              size="small"
                              offset={[-2, 24]}
                            >
                              {renderPresenceAvatar(
                                entry.peerUser,
                                getPeerPresenceStatus(entry.peerUserId),
                              )}
                            </Badge>
                          }
                          title={
                            <Text className={styles.peopleName}>
                              {entry.peerUser.name}
                            </Text>
                          }
                          description={
                            <div className={styles.peopleDescription}>
                              {roleLabel ? (
                                <Text className={styles.peopleRole}>{roleLabel}</Text>
                              ) : null}
                              {typingByUserId[entry.peerUserId] ? (
                                <span className={styles.peopleTyping}>
                                  <TypingIndicator label={null} />
                                </span>
                              ) : entry.lastMessage ? (
                                <Text className={styles.peopleMeta}>
                                  {entry.lastMessage}
                                </Text>
                              ) : null}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
          </div>
        ) : null}

        <Badge count={hasRoomMention ? "@" : unreadTotal} overflowCount={9}>
          <Button
            type="primary"
            shape="circle"
            className={styles.launcherButton}
            icon={<MessageOutlined />}
            onClick={() => setIsComposerOpen((current) => !current)}
          />
        </Badge>
      </div>

      <AttachmentPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        attachments={previewAttachments}
        initialIndex={previewInitialIndex}
        isImageFile={isImageFile}
        isPDFFile={isPDFFile}
        onDownload={(url, name) => {
          if (!url) return;
          const link = document.createElement("a");
          link.href = buildFileProxyUrl(url);
          link.download = name || "download";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      />
    </>
  );
};

export default ChatWidget;

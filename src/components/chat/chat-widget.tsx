"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
  Typography,
  message,
} from "antd";
import {
  CloseOutlined,
  LinkOutlined,
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
  getChatUsers,
  markChatMessagesRead,
  normalizeChatMessage,
  normalizeChatUser,
  sendChatMessage,
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
      const parsed = JSON.parse(trimmed) as ChatMessagePayload;
      const attachments = Array.isArray(parsed.attachments)
        ? parsed.attachments
            .map(normalizeChatAttachment)
            .filter((item): item is ChatAttachmentMetadata => Boolean(item))
        : [];
      const reply =
        parsed.reply &&
        typeof parsed.reply === "object" &&
        typeof parsed.reply.author === "string" &&
        typeof parsed.reply.text === "string"
          ? {
              author: parsed.reply.author,
              text: parsed.reply.text,
              messageId:
                typeof parsed.reply.messageId === "string"
                  ? parsed.reply.messageId
                  : undefined,
            }
          : undefined;
      const text = typeof parsed.text === "string" ? parsed.text : "";

      if (text || attachments.length > 0 || reply) {
        return { text, attachments, reply };
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

const buildMessagePayload = (payload: ChatMessagePayload) =>
  JSON.stringify(payload);

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
    value?.user_id,
    value?.id,
    value?.peerUserId,
    value?.peer_user_id,
    value?.user?.id,
    value?.user?.userId,
    value?.user?.user_id,
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
          <span key={`token-${lineIndex}-${tokenIndex}`}>{token}</span>
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

const mergeMessages = (current: ChatMessage[] = [], next: ChatMessage) => {
  const map = new Map<string, ChatMessage>();

  for (const item of current) {
    if (item?.id) {
      map.set(item.id, item);
    }
  }

  if (next?.id) {
    map.set(next.id, next);
  }

  return Array.from(map.values()).sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
};

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
  const { socket } = useWebSocket();

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
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<string, ChatPresenceStatus>
  >({});
  const [loadingByPeerId, setLoadingByPeerId] = useState<
    Record<string, boolean>
  >({});
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAttachments, setPreviewAttachments] = useState<CardAttachment[]>(
    [],
  );
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);

  const loadingPeersRef = useRef(new Set<string>());
  const markReadInFlightRef = useRef(new Set<string>());
  const chatWindowsRef = useRef<ChatWindowState[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const messageEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const lastIncomingSoundAtRef = useRef(0);
  const storageKey = `${CHAT_WINDOWS_STORAGE_PREFIX}_${currentUserId || "anon"}`;

  useEffect(() => {
    chatWindowsRef.current = chatWindows;
  }, [chatWindows]);

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

  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCount || 0),
    0,
  );

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
  }, [conversations, currentUserId, users]);

  const filteredPeople = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return people;
    }

    return people.filter((entry) => {
      const name = entry.peerUser.name || "";
      const username = entry.peerUser.username || "";
      const email = entry.peerUser.email || "";
      const lastMessage = entry.lastMessage || "";

      return (
        name.toLowerCase().includes(needle) ||
        username.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle) ||
        lastMessage.toLowerCase().includes(needle)
      );
    });
  }, [people, searchTerm]);

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
  ) => (
    <span
      className={`${styles.presenceAvatarWrap} ${
        size && size >= 40 ? styles.presenceAvatarWrapLarge : ""
      }`}
    >
      <Avatar src={peerUser.avatar} size={size} className={className}>
        {peerUser.name?.slice(0, 1)}
      </Avatar>
      <span
        className={`${styles.presenceDot} ${
          presenceStatus === "online"
            ? styles.presenceDotOnline
            : presenceStatus === "idle"
              ? styles.presenceDotIdle
              : styles.presenceDotOffline
        }`}
      />
    </span>
  );

  const setPeerUnreadZero = (peerUserId: string) => {
    queryClient.setQueryData<ChatConversation[]>(
      queryKeys.chat.conversations(),
      (current) => upsertUnreadCount(current, peerUserId, 0),
    );
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

  const loadMessages = async (peerUserId: string) => {
    if (!peerUserId || loadingPeersRef.current.has(peerUserId)) {
      return;
    }

    loadingPeersRef.current.add(peerUserId);
    setLoadingByPeerId((current) => ({ ...current, [peerUserId]: true }));

    try {
      const messages = await getChatMessages(peerUserId);
      setMessagesByPeerId((current) => ({ ...current, [peerUserId]: messages }));
      queryClient.setQueryData(queryKeys.chat.messages(peerUserId), messages);
    } catch (error) {
      console.error("[CHAT] Failed to load messages", error);
      message.error("Failed to load messages");
    } finally {
      loadingPeersRef.current.delete(peerUserId);
      setLoadingByPeerId((current) => ({ ...current, [peerUserId]: false }));
    }
  };

  const openWindow = (peerUserId: string) => {
    if (!peerUserId) {
      return;
    }

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

    if ((conversationByPeerId.get(peerUserId)?.unreadCount || 0) > 0) {
      markReadMutation.mutate(
        { peerUserId },
        {
          onSuccess: () => setPeerUnreadZero(peerUserId),
        },
      );
    }
  };

  const minimizeWindow = (peerUserId: string) => {
    setChatWindows((current) =>
      upsertWindow(current, peerUserId, {
        minimized: true,
        openedAt: Date.now(),
      }),
    );
  };

  const closeWindow = (peerUserId: string) => {
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

  const handleSend = async (peerUserId: string) => {
    const replyTarget = replyByPeerId[peerUserId];
    const content = (draftByPeerId[peerUserId] || "").trim();
    const pendingFiles = pendingFilesByPeerId[peerUserId] || [];

    if ((!content && pendingFiles.length === 0) || sendingByPeerId[peerUserId]) {
      return;
    }

    setSendingByPeerId((current) => ({ ...current, [peerUserId]: true }));

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
              author: replyTarget.author,
              text: replyTarget.text,
            }
          : undefined,
      });

      const sentMessage = await sendMessageMutation.mutateAsync({
        peerUserId,
        content: payloadContent,
      });
      const normalizedMessage = normalizeChatMessage(sentMessage);
      const finalMessage = { ...normalizedMessage, peerUserId };
      const peerUser = getPeerUser(peerUserId);

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
            true,
            true,
          ),
      );

      setDraftByPeerId((current) => ({ ...current, [peerUserId]: "" }));
      setReplyByPeerId((current) => ({ ...current, [peerUserId]: undefined }));
      setPendingFilesByPeerId((current) => ({ ...current, [peerUserId]: [] }));
    } catch {
      message.error("Failed to send message");
    } finally {
      setSendingByPeerId((current) => ({ ...current, [peerUserId]: false }));
    }
  };

  useEffect(() => {
    for (const window of visibleWindows) {
      const ref = messageEndRefs.current[window.peerUserId];
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth" });
      }
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

        if (!isOwnMessage && isOpenAndActive) {
          markReadMutation.mutate(
            { peerUserId },
            {
              onSuccess: () => setPeerUnreadZero(peerUserId),
            },
          );
        }

        if (!isOwnMessage) {
          playIncomingMessageSound();
        }
      } catch (error) {
        console.error("[CHAT] Failed to process websocket message", error);
      }
    };

    socket.addEventListener("message", handleSocketMessage);
    return () => socket.removeEventListener("message", handleSocketMessage);
  }, [currentUserId, markReadMutation, queryClient, socket]);

  return (
    <>
      <div className={styles.windowRail}>
        {visibleWindows.map((window) => {
          const peerUser = getPeerUser(window.peerUserId);
          const messages = messagesByPeerId[window.peerUserId] || [];
          const isLoading = Boolean(loadingByPeerId[window.peerUserId]);
          const unreadCount =
            conversationByPeerId.get(window.peerUserId)?.unreadCount || 0;
          const draft = draftByPeerId[window.peerUserId] || "";
          const replyTarget = replyByPeerId[window.peerUserId];
          const pendingFiles = pendingFilesByPeerId[window.peerUserId] || [];
          const sendingThisPeer = Boolean(sendingByPeerId[window.peerUserId]);
          const isDragOver = Boolean(isDragOverByPeerId[window.peerUserId]);
          const canSend = Boolean(draft.trim() || pendingFiles.length > 0);

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
                  <Text className={styles.peerName}>{peerUser.name}</Text>
                  {unreadCount > 0 ? (
                    <Badge
                      count={unreadCount}
                      className={styles.headerBadge}
                      overflowCount={99}
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

              <div className={styles.chatWindowBody}>
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
                    const parsedMessage = parseMessagePayload(chatMessage.content || "");
                    const attachments = parsedMessage.attachments;
                    const parsedReply = parsedMessage.reply;

                    return (
                      <div
                        key={chatMessage.id}
                        className={`${styles.messageRow} ${
                          isOwnMessage ? styles.messageRowOwn : ""
                        }`}
                      >
                        <div
                          className={`${styles.messageBubble} ${
                            isOwnMessage ? styles.messageBubbleOwn : ""
                          }`}
                        >
                          <div className={styles.messageText}>
                            {parsedReply ? (
                              <>
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
                          <div className={styles.messageMetaRow}>
                            <div className={styles.messageTime}>
                              {formatTime(chatMessage.createdAt)}
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
                                    author: isOwnMessage
                                      ? currentUser?.username || currentUser?.id || "Unknown"
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
                        </div>
                      </div>
                    );
                  })
                )}
                <div
                  ref={(element) => {
                    messageEndRefs.current[window.peerUserId] = element;
                  }}
                />
              </div>

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
                  <Input
                    value={draft}
                    placeholder="Aa"
                    onChange={(event) =>
                      setDraftByPeerId((current) => ({
                        ...current,
                        [window.peerUserId]: event.target.value,
                      }))
                    }
                    onPressEnter={() => void handleSend(window.peerUserId)}
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
                  conversationByPeerId.get(window.peerUserId)?.unreadCount || 0;

                return (
                  <List.Item
                    className={styles.overflowItem}
                    onClick={() => openWindow(window.peerUserId)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={unreadCount} size="small" offset={[-2, 24]}>
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
            conversationByPeerId.get(window.peerUserId)?.unreadCount || 0;

          return (
            <Badge
              key={window.peerUserId}
              count={unreadCount}
              overflowCount={99}
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
                  renderItem={(entry) => (
                    <List.Item
                      className={styles.peopleItem}
                      onClick={() => openWindow(entry.peerUserId)}
                    >
                      <List.Item.Meta
                      avatar={
                        <Badge
                          count={entry.unreadCount}
                          overflowCount={99}
                          size="small"
                          offset={[-2, 24]}
                        >
                          {renderPresenceAvatar(
                            entry.peerUser,
                            getPeerPresenceStatus(entry.peerUserId),
                          )}
                        </Badge>
                      }
                        title={<Text className={styles.peopleName}>{entry.peerUser.name}</Text>}
                        description={
                          entry.lastMessage ? (
                            <Text className={styles.peopleMeta}>
                              {entry.lastMessage}
                            </Text>
                          ) : entry.peerUser.username ? (
                            <Text className={styles.peopleMeta}>
                              @{entry.peerUser.username}
                            </Text>
                          ) : null
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        ) : null}

        <Badge count={unreadTotal} overflowCount={99}>
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

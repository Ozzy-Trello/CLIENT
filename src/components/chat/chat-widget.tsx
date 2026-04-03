"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import camelcaseKeys from "camelcase-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  List,
  Spin,
  Typography,
  message,
} from "antd";
import {
  CloseOutlined,
  MessageOutlined,
  MinusOutlined,
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
import type { ChatConversation, ChatMessage, ChatUser } from "@myTypes/chat";

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
    rawData?.conversationPeerId ||
    rawData?.conversation_peer_id;

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
  const [messagesByPeerId, setMessagesByPeerId] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [loadingByPeerId, setLoadingByPeerId] = useState<
    Record<string, boolean>
  >({});

  const loadingPeersRef = useRef(new Set<string>());
  const markReadInFlightRef = useRef(new Set<string>());
  const chatWindowsRef = useRef<ChatWindowState[]>([]);
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
    onError: () => {
      message.error("Failed to send message");
    },
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

  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCount || 0),
    0,
  );

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
        lastMessage: conversation.lastMessage?.content || "",
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
  };

  const handleSend = async (peerUserId: string) => {
    const content = (draftByPeerId[peerUserId] || "").trim();
    if (!content || sendMessageMutation.isPending) {
      return;
    }

    sendMessageMutation.mutate(
      { peerUserId, content },
      {
        onSuccess: (sentMessage) => {
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
        },
      },
    );
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

        if (eventName !== "chat:new-message") {
          return;
        }

        const rawMessage = payload?.data || payload?.message || payload;
        const normalizedMessage = normalizeChatMessage(rawMessage);
        const peerUserId = resolvePeerUserId(
          normalizedMessage,
          currentUserId,
          rawMessage,
        );

        if (!peerUserId || !normalizedMessage.id) {
          return;
        }

        const isOwnMessage =
          Boolean(currentUserId) && normalizedMessage.senderId === currentUserId;
        const peerUser =
          resolvePeerUser(normalizedMessage, rawMessage, currentUserId) ||
          getPeerUser(peerUserId);

        const existingWindow = chatWindowsRef.current.find(
          (window) => window.peerUserId === peerUserId,
        );
        const isOpenAndActive = Boolean(existingWindow && !existingWindow.minimized);

        const finalMessage = {
          ...normalizedMessage,
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
          const sendingThisPeer =
            sendMessageMutation.isPending &&
            sendMessageMutation.variables?.peerUserId === window.peerUserId;

          return (
            <div key={window.peerUserId} className={styles.chatWindow}>
              <div className={styles.chatWindowHeader}>
                <div className={styles.chatWindowPeer}>
                  <Avatar
                    src={peerUser.avatar}
                    size={28}
                    className={styles.peerAvatar}
                  >
                    {peerUser.name?.slice(0, 1)}
                  </Avatar>
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
                            {chatMessage.content}
                          </div>
                          <div className={styles.messageTime}>
                            {formatTime(chatMessage.createdAt)}
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

              <div className={styles.chatWindowComposer}>
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
                />
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  onClick={() => void handleSend(window.peerUserId)}
                  className={styles.sendButton}
                  loading={sendingThisPeer}
                  disabled={!draft.trim()}
                />
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
                          <Avatar src={peerUser.avatar}>
                            {peerUser.name?.slice(0, 1)}
                          </Avatar>
                        </Badge>
                      }
                      title={<Text className={styles.overflowName}>{peerUser.name}</Text>}
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
                <Avatar
                  src={peerUser.avatar}
                  size={46}
                  className={styles.minimizedAvatar}
                >
                  {peerUser.name?.slice(0, 1)}
                </Avatar>
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
                            <Avatar
                              src={entry.peerUser.avatar}
                            >
                              {entry.peerUser.name?.slice(0, 1)}
                            </Avatar>
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
    </>
  );
};

export default ChatWidget;

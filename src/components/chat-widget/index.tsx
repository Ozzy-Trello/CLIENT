"use client";

import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Segmented,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import { MessageCircle, Minus, Search, Send, Users } from "lucide-react";
import camelcaseKeys from "camelcase-keys";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";
import { useWebSocket } from "@hooks/websocket";
import {
  useChatConversations,
  useChatMessages,
  useChatUsers,
  useMarkChatMessagesRead,
  useSendChatMessage,
} from "@hooks/chat";
import {
  ChatConversationSummary,
  ChatMessage,
  ChatUserSummary,
} from "@myTypes/chat";
import styles from "./chat-widget.module.css";

const { Text, Title } = Typography;
const { TextArea } = Input;

type ChatView = "conversations" | "directory";

const getUserInitials = (username: string) =>
  username
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

const formatMessageTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    ...(sameDay
      ? {}
      : {
          day: "2-digit",
          month: "short",
        }),
  }).format(date);
};

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });

const mergeMessages = (messages: ChatMessage[], incoming: ChatMessage) => {
  if (messages.some((messageItem) => messageItem.id === incoming.id)) {
    return messages.map((messageItem) =>
      messageItem.id === incoming.id ? incoming : messageItem,
    );
  }

  return sortMessages([...messages, incoming]);
};

const sortConversations = (conversations: ChatConversationSummary[]) =>
  [...conversations].sort((left, right) => {
    const leftTime = left.lastMessage?.createdAt
      ? new Date(left.lastMessage.createdAt).getTime()
      : 0;
    const rightTime = right.lastMessage?.createdAt
      ? new Date(right.lastMessage.createdAt).getTime()
      : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.peerUser.username.localeCompare(right.peerUser.username);
  });

const ensureConversation = (
  conversations: ChatConversationSummary[],
  peerUser: ChatUserSummary,
): ChatConversationSummary[] => {
  if (conversations.some((conversation) => conversation.peerUser.id === peerUser.id)) {
    return conversations;
  }

  return sortConversations([
    {
      peerUser,
      lastMessage: null,
      unreadCount: 0,
    },
    ...conversations,
  ]);
};

const updateConversationState = (
  conversations: ChatConversationSummary[],
  peerUser: ChatUserSummary,
  messageItem: ChatMessage,
  options: {
    incrementUnread?: boolean;
    resetUnread?: boolean;
  } = {},
) => {
  const nextConversations = conversations.filter(
    (conversation) => conversation.peerUser.id !== peerUser.id,
  );
  const existingConversation = conversations.find(
    (conversation) => conversation.peerUser.id === peerUser.id,
  );

  let unreadCount = existingConversation?.unreadCount || 0;

  if (options.resetUnread) {
    unreadCount = 0;
  } else if (options.incrementUnread) {
    unreadCount += 1;
  }

  nextConversations.unshift({
    peerUser,
    lastMessage: messageItem,
    unreadCount,
  });

  return sortConversations(nextConversations);
};

const markMessagesReadLocally = (
  messages: ChatMessage[],
  peerUserId: string,
  currentUserId: string,
) =>
  messages.map((messageItem) => {
    if (
      messageItem.senderId !== peerUserId ||
      messageItem.recipientId !== currentUserId
    ) {
      return messageItem;
    }

    return {
      ...messageItem,
      isRead: true,
    };
  });

const ChatWidget: React.FC = () => {
  const currentUser = useSelector(selectUser);
  const { socket, isConnected } = useWebSocket();
  const [messageApi, contextHolder] = message.useMessage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<ChatView>("conversations");
  const [selectedPeer, setSelectedPeer] = useState<ChatUserSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [draftMessage, setDraftMessage] = useState("");
  const [conversationItems, setConversationItems] = useState<
    ChatConversationSummary[]
  >([]);
  const [messageItems, setMessageItems] = useState<ChatMessage[]>([]);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const lastIncomingSoundAtRef = useRef(0);

  const conversationsQuery = useChatConversations(!!currentUser?.id);
  const usersQuery = useChatUsers(
    activeView === "directory" ? deferredSearchQuery.trim() : "",
    !!currentUser?.id && isOpen && activeView === "directory",
  );
  const messagesQuery = useChatMessages(
    selectedPeer?.id || "",
    !!currentUser?.id && isOpen && !!selectedPeer,
  );
  const sendMessageMutation = useSendChatMessage();
  const markReadMutation = useMarkChatMessagesRead();

  useEffect(() => {
    if (!conversationsQuery.data?.data) {
      return;
    }

    setConversationItems(sortConversations(conversationsQuery.data.data));
  }, [conversationsQuery.data]);

  useEffect(() => {
    if (!messagesQuery.data?.data) {
      return;
    }

    setMessageItems(sortMessages(messagesQuery.data.data.data));
    setSelectedPeer(messagesQuery.data.data.peerUser);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!isOpen || activeView !== "conversations" || selectedPeer || conversationItems.length === 0) {
      return;
    }

    setSelectedPeer(conversationItems[0].peerUser);
  }, [activeView, conversationItems, isOpen, selectedPeer]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unlockAudio = () => {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

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

  useEffect(() => {
    if (!isOpen || !selectedPeer) {
      return;
    }

    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isOpen, selectedPeer, messageItems]);

  const unreadTotal = conversationItems.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );

  const filteredConversations = conversationItems.filter((conversation) =>
    conversation.peerUser.username
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  const selectConversation = async (peerUser: ChatUserSummary) => {
    setIsOpen(true);
    setActiveView("conversations");
    setSelectedPeer(peerUser);
    setConversationItems((currentConversations) =>
      ensureConversation(currentConversations, peerUser),
    );

    if (!currentUser?.id) {
      return;
    }

    const unreadConversation = conversationItems.find(
      (conversation) => conversation.peerUser.id === peerUser.id,
    );

    if (!unreadConversation?.unreadCount) {
      return;
    }

    setConversationItems((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.peerUser.id === peerUser.id
          ? {
              ...conversation,
              unreadCount: 0,
            }
          : conversation,
      ),
    );
    setMessageItems((currentMessages) =>
      markMessagesReadLocally(currentMessages, peerUser.id, currentUser.id),
    );

    try {
      await markReadMutation.mutateAsync({
        peerUserId: peerUser.id,
      });
    } catch (error: any) {
      messageApi.error(
        error?.response?.data?.message || "Failed to mark messages as read",
      );
    }
  };

  const playIncomingMessageSound = useEffectEvent(() => {
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
  });

  const handleSocketMessage = useEffectEvent(async (event: MessageEvent) => {
    if (!currentUser?.id) {
      return;
    }

    try {
      const rawPayload = JSON.parse(event.data);
      const payload = camelcaseKeys(rawPayload, { deep: true }) as {
        event?: string;
        data?: any;
      };

      if (payload.event !== "chat:new-message") {
        return;
      }

      const rawPayloadData = payload.data || payload;
      const eventData =
        rawPayloadData?.event === "chat:new-message" && rawPayloadData?.data
          ? rawPayloadData.data
          : rawPayloadData?.payload || rawPayloadData;
      const incomingMessageRaw =
        eventData?.id || eventData?.senderId || eventData?.sender_id
          ? eventData
          : eventData?.message || eventData?.data?.message || eventData?.data;
      const senderUser =
        eventData?.sender ||
        eventData?.senderUser ||
        eventData?.sender_user ||
        null;
      const recipientUser =
        eventData?.recipient ||
        eventData?.recipientUser ||
        eventData?.recipient_user ||
        null;
      const peerUser = (() => {
        if (eventData?.peerUser || eventData?.peer_user) {
          return eventData?.peerUser || eventData?.peer_user;
        }

        if (incomingMessageRaw?.senderId === currentUser.id) {
          return recipientUser;
        }

        if (incomingMessageRaw?.recipientId === currentUser.id) {
          return senderUser;
        }

        if (selectedPeer?.id) {
          return selectedPeer;
        }

        return senderUser || recipientUser || null;
      })();

      if (!incomingMessageRaw || !peerUser?.id) {
        return;
      }

      const incomingMessage: ChatMessage = {
        ...incomingMessageRaw,
        id:
          incomingMessageRaw.id ||
          `ws-${peerUser.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderId:
          incomingMessageRaw.senderId ||
          senderUser?.id ||
          eventData?.senderId ||
          eventData?.sender_id ||
          "",
        recipientId:
          incomingMessageRaw.recipientId ||
          recipientUser?.id ||
          eventData?.recipientId ||
          eventData?.recipient_id ||
          "",
      };

      const isIncomingForCurrentUser =
        incomingMessage.senderId === peerUser.id &&
        incomingMessage.recipientId === currentUser.id;
      const isActiveConversation =
        isOpen && selectedPeer?.id === peerUser.id && activeView === "conversations";

      setConversationItems((currentConversations) =>
        updateConversationState(currentConversations, peerUser, incomingMessage, {
          incrementUnread: isIncomingForCurrentUser && !isActiveConversation,
          resetUnread: isIncomingForCurrentUser && isActiveConversation,
        }),
      );

      if (selectedPeer?.id === peerUser.id) {
        setMessageItems((currentMessages) =>
          mergeMessages(
            currentMessages,
            isIncomingForCurrentUser && isActiveConversation
              ? {
                  ...incomingMessage,
                  isRead: true,
                }
              : incomingMessage,
          ),
        );
      }

      if (isIncomingForCurrentUser && isActiveConversation) {
        try {
          await markReadMutation.mutateAsync({
            peerUserId: peerUser.id,
          });
        } catch {
          // Keep UI responsive even if read sync fails.
        }
      }

      if (isIncomingForCurrentUser) {
        playIncomingMessageSound();
      }
    } catch {
      // Ignore malformed websocket payloads.
    }
  });

  useEffect(() => {
    if (!socket) {
      return;
    }

    const listener = (event: MessageEvent) => {
      void handleSocketMessage(event);
    };

    socket.addEventListener("message", listener);

    return () => {
      socket.removeEventListener("message", listener);
    };
  }, [handleSocketMessage, socket]);

  const handleSendMessage = async () => {
    const trimmedMessage = draftMessage.trim();
    if (!trimmedMessage || !selectedPeer) {
      return;
    }

    try {
      const response = await sendMessageMutation.mutateAsync({
        recipientId: selectedPeer.id,
        message: trimmedMessage,
      });

      setDraftMessage("");
      setConversationItems((currentConversations) =>
        updateConversationState(
          currentConversations,
          response.data.peerUser,
          response.data.message,
        ),
      );
      setMessageItems((currentMessages) =>
        mergeMessages(currentMessages, response.data.message),
      );
    } catch (error: any) {
      messageApi.error(error?.response?.data?.message || "Failed to send message");
    }
  };

  if (!currentUser?.id) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <div className={styles.launcher}>
        <Badge count={unreadTotal} size="small">
          <Tooltip title={isOpen ? "Hide messages" : "Open messages"}>
            <button
              className={styles.launcherButton}
              onClick={() => setIsOpen((currentState) => !currentState)}
              type="button"
            >
              {isOpen ? <Minus size={20} /> : <MessageCircle size={20} />}
            </button>
          </Tooltip>
        </Badge>
      </div>

      {isOpen ? (
        <section className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Title level={5} style={{ color: "#fff", margin: 0 }}>
                Direct messages
              </Title>
              <span className={styles.headerBadge}>
                {isConnected ? "Realtime connected" : "Realtime reconnecting"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={styles.statusDot} />
              <Button
                aria-label="Hide chat"
                onClick={() => setIsOpen(false)}
                size="small"
                type="text"
              >
                <Minus size={16} />
              </Button>
            </div>
          </div>

          <div className={styles.body}>
            <aside className={styles.sidebar}>
              <div className={styles.sidebarControls}>
                <Segmented<ChatView>
                  block
                  onChange={(value) => setActiveView(value)}
                  options={[
                    {
                      label: "Chats",
                      value: "conversations",
                    },
                    {
                      label: "People",
                      value: "directory",
                    },
                  ]}
                  value={activeView}
                />
                <Input
                  allowClear
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    activeView === "directory"
                      ? "Find people"
                      : "Search chats"
                  }
                  prefix={
                    activeView === "directory" ? (
                      <Users size={14} />
                    ) : (
                      <Search size={14} />
                    )
                  }
                  value={searchQuery}
                />
              </div>

              <div className={styles.sidebarList}>
                {activeView === "conversations" ? (
                  conversationsQuery.isLoading ? (
                    <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
                      <Spin size="small" />
                    </div>
                  ) : filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                      <button
                        className={`${styles.sidebarItem} ${
                          selectedPeer?.id === conversation.peerUser.id
                            ? styles.sidebarItemActive
                            : ""
                        }`}
                        key={conversation.peerUser.id}
                        onClick={() => void selectConversation(conversation.peerUser)}
                        type="button"
                      >
                        <div className={styles.sidebarItemRow}>
                          <Badge count={conversation.unreadCount} size="small">
                            <Avatar
                              size={34}
                              src={conversation.peerUser.profilePicture || undefined}
                            >
                              {getUserInitials(conversation.peerUser.username)}
                            </Avatar>
                          </Badge>
                          <div className={styles.sidebarMeta}>
                            <span className={styles.sidebarUsername}>
                              {conversation.peerUser.username}
                            </span>
                            <span className={styles.sidebarPreview}>
                              {conversation.lastMessage?.message || "No messages yet"}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <Empty
                        description="No conversations"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </div>
                  )
                ) : usersQuery.isLoading ? (
                  <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
                    <Spin size="small" />
                  </div>
                ) : usersQuery.data?.data?.length ? (
                  usersQuery.data.data.map((user) => (
                    <button
                      className={`${styles.sidebarItem} ${
                        selectedPeer?.id === user.id ? styles.sidebarItemActive : ""
                      }`}
                      key={user.id}
                      onClick={() => void selectConversation(user)}
                      type="button"
                    >
                      <div className={styles.sidebarItemRow}>
                        <Avatar size={34} src={user.profilePicture || undefined}>
                          {getUserInitials(user.username)}
                        </Avatar>
                        <div className={styles.sidebarMeta}>
                          <span className={styles.sidebarUsername}>
                            {user.username}
                          </span>
                          <span className={styles.sidebarPreview}>
                            Start a conversation
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <Empty
                      description="No users found"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </div>
                )}
              </div>
            </aside>

            <main className={styles.thread}>
              {selectedPeer ? (
                <>
                  <div className={styles.threadHeader}>
                    <Avatar size={40} src={selectedPeer.profilePicture || undefined}>
                      {getUserInitials(selectedPeer.username)}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          color: "#fff",
                          display: "block",
                        }}
                      >
                        {selectedPeer.username}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.55)" }}>
                        One-on-one conversation
                      </Text>
                    </div>
                  </div>

                  <div className={styles.threadMessages}>
                    {messagesQuery.isLoading ? (
                      <div className={styles.emptyState}>
                        <Spin />
                      </div>
                    ) : messageItems.length > 0 ? (
                      messageItems.map((messageItem) => {
                        const isOutgoing = messageItem.senderId === currentUser.id;

                        return (
                          <div
                            className={`${styles.messageRow} ${
                              isOutgoing ? styles.messageRowOutgoing : ""
                            }`}
                            key={messageItem.id}
                          >
                            <div
                              className={`${styles.messageBubble} ${
                                isOutgoing ? styles.messageBubbleOutgoing : ""
                              }`}
                            >
                              <span className={styles.messageText}>
                                {messageItem.message}
                              </span>
                              <span className={styles.messageTime}>
                                {formatMessageTime(messageItem.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles.emptyState}>
                        <Empty
                          description="Say hello to get started"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </div>
                    )}
                    <div ref={messageEndRef} />
                  </div>

                  <div className={styles.composer}>
                    <div className={styles.composerInput} style={{ flex: 1 }}>
                      <TextArea
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        onPressEnter={(event) => {
                          if (!event.shiftKey) {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder={`Message ${selectedPeer.username}`}
                        value={draftMessage}
                      />
                    </div>
                    <Button
                      disabled={!draftMessage.trim()}
                      icon={<Send size={14} />}
                      loading={sendMessageMutation.isPending}
                      onClick={() => void handleSendMessage()}
                      type="primary"
                    />
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <Empty
                    description="Pick a teammate to start chatting"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )}
            </main>
          </div>
        </section>
      ) : null}
    </>
  );
};

export default ChatWidget;

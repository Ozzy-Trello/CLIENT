"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import camelcaseKeys from "camelcase-keys";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CloseOutlined,
  MessageOutlined,
  SendOutlined,
  SearchOutlined,
  UserOutlined,
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
import type {
  ChatConversation,
  ChatMessage,
  ChatUser,
} from "@myTypes/chat";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

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
    left.createdAt.localeCompare(right.createdAt)
  );
};

const resolvePeerUserId = (
  messageData: ChatMessage,
  currentUserId?: string,
  rawData?: any
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
  currentUserId?: string
) => {
  if (currentUserId && messageData.senderId === currentUserId) {
    return normalizeChatUser(
      rawData?.recipient ?? rawData?.toUser ?? rawData?.peerUser ?? {}
    );
  }

  if (currentUserId && messageData.recipientId === currentUserId) {
    return normalizeChatUser(
      rawData?.sender ?? rawData?.fromUser ?? rawData?.peerUser ?? {}
    );
  }

  return normalizeChatUser(
    rawData?.peerUser ?? rawData?.sender ?? rawData?.recipient ?? rawData?.user ?? {}
  );
};

const upsertConversation = (
  current: ChatConversation[] | undefined,
  next: ChatConversation
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
  unreadCount: number
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
  isActiveThread: boolean
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
      : isActiveThread
        ? 0
        : (existing?.unreadCount || 0) + 1,
    updatedAt: messageData.createdAt,
  };

  return upsertConversation(list, nextConversation);
};

const ChatWidget = () => {
  const currentUser = useSelector(selectUser);
  const currentUserId = currentUser?.id;
  const queryClient = useQueryClient();
  const { socket } = useWebSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const conversationsQuery = useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: getChatConversations,
    staleTime: 15_000,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.chat.users(),
    queryFn: getChatUsers,
    enabled: isOpen,
    staleTime: 60_000,
  });

  const activeMessagesQuery = useQuery({
    queryKey: queryKeys.chat.messages(activePeerId || ""),
    queryFn: () => getChatMessages(activePeerId || ""),
    enabled: isOpen && Boolean(activePeerId),
    staleTime: 5_000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (sentMessage) => {
      if (!activePeerId) {
        return;
      }

      const normalizedMessage = normalizeChatMessage(sentMessage);
      const peerUser =
        activePeerUser ||
        resolvePeerUser(normalizedMessage, sentMessage, currentUserId) ||
        normalizeChatUser({ id: activePeerId, name: activePeerId });
      const peerId = resolvePeerUserId(normalizedMessage, currentUserId, sentMessage) || activePeerId;

      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.chat.messages(peerId),
        (current) => mergeMessages(current, { ...normalizedMessage, peerUserId: peerId })
      );

      queryClient.setQueryData<ChatConversation[]>(
        queryKeys.chat.conversations(),
        (current) =>
          updateConversationForMessage(
            current,
            peerId,
            peerUser,
            { ...normalizedMessage, peerUserId: peerId },
            true,
            true
          )
      );

      setDraftMessage("");
    },
    onError: () => {
      message.error("Failed to send message");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: markChatMessagesRead,
  });

  const conversations = conversationsQuery.data || [];
  const users = usersQuery.data || [];
  const activeMessages = activeMessagesQuery.data || [];

  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + (conversation.unreadCount || 0),
    0
  );

  const activeConversation = useMemo(() => {
    if (!activePeerId) {
      return null;
    }

    return (
      conversations.find((conversation) => conversation.peerUserId === activePeerId) ||
      null
    );
  }, [activePeerId, conversations]);

  const activePeerUser = useMemo(() => {
    if (!activePeerId) {
      return null;
    }

    return (
      activeConversation?.peerUser ||
      users.find((user) => user.id === activePeerId) ||
      normalizeChatUser({ id: activePeerId, name: activePeerId })
    );
  }, [activePeerId, activeConversation, users]);

  const filteredConversations = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const name = conversation.peerUser?.name || "";
      const username = conversation.peerUser?.username || "";
      const lastMessage = conversation.lastMessage?.content || "";

      return (
        name.toLowerCase().includes(needle) ||
        username.toLowerCase().includes(needle) ||
        lastMessage.toLowerCase().includes(needle)
      );
    });
  }, [conversations, searchTerm]);

  const filteredUsers = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (user.id === currentUserId) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(needle) ||
        (user.username || "").toLowerCase().includes(needle) ||
        (user.email || "").toLowerCase().includes(needle)
      );
    });
  }, [conversations, currentUserId, searchTerm, users]);

  useEffect(() => {
    if (!isOpen || activePeerId || conversations.length === 0) {
      return;
    }

    setActivePeerId(conversations[0].peerUserId);
  }, [activePeerId, conversations, isOpen]);

  useEffect(() => {
    if (!isOpen || !activePeerId) {
      return;
    }

    const currentUnread = activeConversation?.unreadCount || 0;
    if (currentUnread > 0) {
      markReadMutation.mutate(
        { peerUserId: activePeerId },
        {
          onSuccess: () => {
            queryClient.setQueryData<ChatConversation[]>(
              queryKeys.chat.conversations(),
              (current) =>
                upsertUnreadCount(current, activePeerId, 0)
            );
          },
        }
      );
    }
  }, [activeConversation?.unreadCount, activePeerId, isOpen, markReadMutation, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, isOpen, activePeerId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        const payload = camelcaseKeys(parsed, { deep: true }) as any;
        const eventName = payload?.event || payload?.type;

        if (eventName !== "chat:new-message") {
          return;
        }

        const rawMessage = payload?.data || payload?.message || payload;
        const normalizedMessage = normalizeChatMessage(rawMessage);
        const peerUserId =
          resolvePeerUserId(normalizedMessage, currentUserId, rawMessage) ||
          activePeerId ||
          normalizedMessage.peerUserId;

        if (!peerUserId || !normalizedMessage.id) {
          return;
        }

        const peerUser =
          activePeerUser ||
          resolvePeerUser(normalizedMessage, rawMessage, currentUserId) ||
          normalizeChatUser({ id: peerUserId, name: peerUserId });
        const isOwnMessage = Boolean(currentUserId) && normalizedMessage.senderId === currentUserId;
        const isActiveThread = isOpen && activePeerId === peerUserId;

        queryClient.setQueryData<ChatMessage[]>(
          queryKeys.chat.messages(peerUserId),
          (current) =>
            mergeMessages(current, {
              ...normalizedMessage,
              peerUserId,
              sender: normalizedMessage.sender ?? (isOwnMessage ? normalizeChatUser(currentUser || {}) : peerUser),
              recipient: normalizedMessage.recipient ?? peerUser,
            })
        );

        queryClient.setQueryData<ChatConversation[]>(
          queryKeys.chat.conversations(),
          (current) =>
            updateConversationForMessage(
              current,
              peerUserId,
              peerUser,
              { ...normalizedMessage, peerUserId },
              isOwnMessage,
              isActiveThread
            )
        );

        if (isActiveThread && !isOwnMessage) {
          markReadMutation.mutate({ peerUserId });
        }
      } catch (error) {
        console.error("[CHAT] Failed to process websocket message", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [
    activePeerId,
    activePeerUser,
    currentUser,
    currentUserId,
    isOpen,
    markReadMutation,
    queryClient,
    socket,
  ]);

  const handleSend = async () => {
    const content = draftMessage.trim();
    if (!content || !activePeerId || sendMessageMutation.isPending) {
      return;
    }

    sendMessageMutation.mutate({
      peerUserId: activePeerId,
      content,
    });
  };

  const handleSelectPeer = (peerUserId: string) => {
    setActivePeerId(peerUserId);
    setIsOpen(true);
  };

  const handleOpenToggle = () => {
    setIsOpen((current) => !current);
  };

  const conversationItems = [
    {
      key: "conversations",
      label: `Chats${unreadTotal ? ` (${unreadTotal})` : ""}`,
      children: (
        <div className={styles.listWrap}>
          {conversationsQuery.isLoading ? (
            <div className={styles.emptyState}>
              <Spin />
            </div>
          ) : filteredConversations.length === 0 ? (
            <Empty description="No conversations" />
          ) : (
            <List
              dataSource={filteredConversations}
              renderItem={(item) => {
                const active = item.peerUserId === activePeerId;
                return (
                  <List.Item
                    className={`${styles.listItem} ${
                      active ? styles.listItemActive : ""
                    }`}
                    onClick={() => handleSelectPeer(item.peerUserId)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge
                          dot={Boolean(item.peerUser?.isOnline)}
                          offset={[-2, 28]}
                          color="#22c55e"
                        >
                          <Avatar
                            src={item.peerUser?.avatar}
                            icon={<UserOutlined />}
                          >
                            {item.peerUser?.name?.slice(0, 1)}
                          </Avatar>
                        </Badge>
                      }
                      title={
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Text
                            ellipsis={{ tooltip: item.peerUser?.name }}
                            style={{ color: "#f8fafc" }}
                          >
                            {item.peerUser?.name}
                          </Text>
                          {item.unreadCount > 0 ? (
                            <Badge count={item.unreadCount} overflowCount={99} />
                          ) : null}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2} style={{ width: "100%" }}>
                          <Text
                            type="secondary"
                            ellipsis={{ tooltip: item.peerUser?.username }}
                            style={{ color: "rgba(226,232,240,0.66)" }}
                          >
                            @{item.peerUser?.username || item.peerUser?.id}
                          </Text>
                          <Paragraph
                            ellipsis={{ rows: 1, tooltip: item.lastMessage?.content }}
                            style={{ color: "rgba(226,232,240,0.78)", marginBottom: 0 }}
                          >
                            {item.lastMessage?.content || "No messages yet"}
                          </Paragraph>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      ),
    },
    {
      key: "people",
      label: "People",
      children: (
        <div className={styles.listWrap}>
          {usersQuery.isLoading ? (
            <div className={styles.emptyState}>
              <Spin />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Empty description="No people found" />
          ) : (
            <List
              dataSource={filteredUsers}
              renderItem={(item) => (
                <List.Item
                  className={styles.listItem}
                  onClick={() => handleSelectPeer(item.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar src={item.avatar} icon={<UserOutlined />}>
                        {item.name?.slice(0, 1)}
                      </Avatar>
                    }
                    title={
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text style={{ color: "#f8fafc" }}>{item.name}</Text>
                        {item.isOnline ? <Tag color="green">Online</Tag> : null}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2} style={{ width: "100%" }}>
                        {item.username ? (
                          <Text style={{ color: "rgba(226,232,240,0.68)" }}>
                            @{item.username}
                          </Text>
                        ) : null}
                        {item.email ? (
                          <Text style={{ color: "rgba(226,232,240,0.62)" }}>
                            {item.email}
                          </Text>
                        ) : null}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {!isOpen ? (
        <div className={styles.launcher}>
          <Badge count={unreadTotal} overflowCount={99}>
            <Button
              type="primary"
              shape="round"
              icon={<MessageOutlined />}
              className={styles.launcherButton}
              onClick={handleOpenToggle}
            />
          </Badge>
        </div>
      ) : null}

      {isOpen ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div>
              <Text className={styles.title}>Direct messages</Text>
              <div>
                <Text className={styles.subtitle}>
                  One-on-one chat across the whole workspace
                </Text>
              </div>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleOpenToggle}
              style={{ color: "#e2e8f0" }}
            />
          </div>

          <div className={styles.body}>
            <div className={styles.sidebar}>
              <div className={styles.search}>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Search people or chats"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Tabs
                className={styles.tabs}
                items={conversationItems}
                defaultActiveKey="conversations"
                onChange={() => {
                  // keep the layout simple; tabs manage the panel content
                }}
              />
            </div>

            <div className={styles.thread}>
              <div className={styles.threadHeader}>
                <Space direction="vertical" size={0}>
                  <Text style={{ color: "#f8fafc", fontWeight: 600 }}>
                    {activePeerUser?.name || "Select a chat"}
                  </Text>
                  <Text style={{ color: "rgba(226,232,240,0.68)" }}>
                    {activePeerUser?.username
                      ? `@${activePeerUser.username}`
                      : "Messages appear here in real time"}
                  </Text>
                </Space>
                {activeConversation?.unreadCount ? (
                  <Tag color="blue">{activeConversation.unreadCount} unread</Tag>
                ) : null}
              </div>

              <div className={styles.messageList}>
                {!activePeerId ? (
                  <div className={styles.emptyState}>
                    <Empty
                      description="Pick a conversation or start a new DM"
                    />
                  </div>
                ) : activeMessagesQuery.isLoading ? (
                  <div className={styles.emptyState}>
                    <Spin />
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Empty description="No messages yet" />
                  </div>
                ) : (
                  activeMessages.map((item) => {
                    const isOwnMessage = Boolean(
                      currentUserId && item.senderId === currentUserId
                    );

                    return (
                      <div
                        key={item.id}
                        className={`${styles.messageRow} ${
                          isOwnMessage ? styles.messageRowOwn : ""
                        }`}
                      >
                        <div
                          className={`${styles.bubble} ${
                            isOwnMessage ? styles.bubbleOwn : ""
                          }`}
                        >
                          <div className={styles.bubbleText}>{item.content}</div>
                          <div className={styles.meta}>
                            {formatTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.composer}>
                <TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  className={styles.composerInput}
                  placeholder={
                    activePeerId ? "Write a message..." : "Choose a chat first"
                  }
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  disabled={!activePeerId}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => void handleSend()}
                  loading={sendMessageMutation.isPending}
                  disabled={!activePeerId || !draftMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ChatWidget;

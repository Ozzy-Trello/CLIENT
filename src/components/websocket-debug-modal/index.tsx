"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Button,
  Typography,
  Card,
  Space,
  Badge,
  List,
  Input,
  message,
  Tabs,
  Tag,
  Divider,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  WifiOutlined,
  DisconnectOutlined,
  SendOutlined,
  ClearOutlined,
  ReloadOutlined,
  BugOutlined,
} from "@ant-design/icons";
import { useWebSocket } from "@hooks/websocket";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface WebSocketMessage {
  id: string;
  timestamp: string;
  event: string;
  data: any;
  direction: "incoming" | "outgoing";
}

interface WebSocketDebugModalProps {
  open: boolean;
  onClose: () => void;
}

const WebSocketDebugModal: React.FC<WebSocketDebugModalProps> = ({
  open,
  onClose,
}) => {
  const { socket, isConnected, connectionAttempts, lastError } = useWebSocket();
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [clientCount, setClientCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const newMessage: WebSocketMessage = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          event: data.event || "unknown",
          data: data,
          direction: "incoming",
        };
        setMessages((prev) => [...prev, newMessage]);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  // Check server health
  const checkServerHealth = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BE_BASE_URL}/ws/health`
      );
      const data = await response.json();
      setServerHealth(data);
      setClientCount(data.connectedClients || 0);
      message.success("Server health checked successfully");
    } catch (error) {
      message.error("Failed to check server health");
      console.error("Health check failed:", error);
    }
  };

  // Test manual broadcast
  const testBroadcast = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BE_BASE_URL}/ws/test-broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: testMessage || "Test message from debug modal",
            timestamp: new Date().toISOString(),
          }),
        }
      );
      const result = await response.json();
      message.success(`Broadcast sent to ${result.clientCount} clients`);
    } catch (error) {
      message.error("Failed to send test broadcast");
      console.error("Broadcast failed:", error);
    }
  };

  // Clear message history
  const clearMessages = () => {
    setMessages([]);
    message.info("Message history cleared");
  };

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get connection status color
  const getStatusColor = () => {
    if (isConnected) return "success";
    if (lastError) return "error";
    return "warning";
  };

  // Get connection status text
  const getStatusText = () => {
    if (isConnected) return "Connected";
    if (lastError) return "Error";
    return "Disconnected";
  };

  const connectionTab = (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic
            title="Connection Status"
            value={getStatusText()}
            prefix={
              isConnected ? (
                <WifiOutlined style={{ color: "#52c41a" }} />
              ) : (
                <DisconnectOutlined style={{ color: "#ff4d4f" }} />
              )
            }
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Connection Attempts"
            value={connectionAttempts}
            prefix={<ReloadOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Server Clients"
            value={clientCount}
            prefix={<WifiOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Messages Received"
            value={messages.filter((m) => m.direction === "incoming").length}
            prefix={<SendOutlined />}
          />
        </Col>
      </Row>

      <Card title="Connection Details" size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text strong>WebSocket URL: </Text>
            <Text code>
              {process.env.NEXT_PUBLIC_BE_BASE_URL?.replace("http", "ws")}/ws
            </Text>
          </div>
          <div>
            <Text strong>Ready State: </Text>
            <Tag color={getStatusColor()}>
              {socket?.readyState === WebSocket.OPEN
                ? "OPEN"
                : socket?.readyState === WebSocket.CONNECTING
                ? "CONNECTING"
                : socket?.readyState === WebSocket.CLOSING
                ? "CLOSING"
                : "CLOSED"}
            </Tag>
          </div>
          {lastError && (
            <div>
              <Text strong>Last Error: </Text>
              <Text type="danger">{lastError}</Text>
            </div>
          )}
        </Space>
      </Card>

      <Card title="Server Health" size="small">
        <Space>
          <Button onClick={checkServerHealth} icon={<ReloadOutlined />}>
            Check Health
          </Button>
          {serverHealth && (
            <Tag color={serverHealth.status === "healthy" ? "green" : "red"}>
              {serverHealth.status}
            </Tag>
          )}
        </Space>
        {serverHealth && (
          <div style={{ marginTop: 8 }}>
            <Text>
              Server Running: {serverHealth.serverRunning ? "Yes" : "No"} |
              Connected Clients: {serverHealth.connectedClients}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );

  const messagesTab = (
    <div>
      <Space style={{ marginBottom: 16, width: "100%" }}>
        <Button onClick={clearMessages} icon={<ClearOutlined />}>
          Clear Messages
        </Button>
        <Text type="secondary">
          {messages.length} messages ({messages.filter((m) => m.direction === "incoming").length} incoming)
        </Text>
      </Space>

      <div
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #d9d9d9",
          borderRadius: "6px",
          padding: "8px",
        }}
      >
        <List
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item key={msg.id} style={{ padding: "8px 0" }}>
              <div style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <Space>
                    <Tag color={msg.direction === "incoming" ? "blue" : "green"}>
                      {msg.direction}
                    </Tag>
                    <Text strong>{msg.event}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {formatTime(msg.timestamp)}
                  </Text>
                </div>
                <div
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              </div>
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
      </div>
    </div>
  );

  const testingTab = (
    <div>
      <Card title="Manual Broadcast Test" size="small" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Enter test message (optional)"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            onPressEnter={testBroadcast}
          />
          <Button
            type="primary"
            onClick={testBroadcast}
            icon={<SendOutlined />}
          >
            Send Test Broadcast
          </Button>
        </Space.Compact>
        <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
          <Text type="secondary">
            This will send a test message to all connected WebSocket clients
            via the server's test endpoint.
          </Text>
        </Paragraph>
      </Card>

      <Card title="Automation Test" size="small">
        <Paragraph>
          <Text strong>To test automation WebSocket events:</Text>
        </Paragraph>
        <ol>
          <li>Create an automation rule (e.g., move card when added to list)</li>
          <li>Trigger the automation by performing the action</li>
          <li>Watch the Messages tab for incoming WebSocket events</li>
          <li>Check server logs for broadcast confirmations</li>
        </ol>
        <Paragraph>
          <Text type="secondary">
            Expected events: CardMoved, custom_field:updated, automation:label_added, etc.
          </Text>
        </Paragraph>
      </Card>
    </div>
  );

  const tabItems = [
    {
      key: "connection",
      label: "Connection",
      children: connectionTab,
    },
    {
      key: "messages",
      label: (
        <Badge count={messages.length} size="small">
          Messages
        </Badge>
      ),
      children: messagesTab,
    },
    {
      key: "testing",
      label: "Testing",
      children: testingTab,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <BugOutlined />
          WebSocket Debug Console
          <Badge
            status={isConnected ? "success" : "error"}
            text={getStatusText()}
          />
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={800}
      style={{ top: 20 }}
    >
      <Tabs defaultActiveKey="connection" items={tabItems} />
    </Modal>
  );
};

export default WebSocketDebugModal;
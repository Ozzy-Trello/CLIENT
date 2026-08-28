"use client";
import { ReactNode, useEffect, useState } from "react";
import { Layout, Menu } from "antd";
import TopBar from "@components/topbar";
import Sidebar from "@components/sidebar";
import ChatWidget from "@components/chat/chat-widget";
import ChatNotificationToast from "@components/chat/chat-notification-toast";
import NotulensiToast from "@components/notifications/notulensi-toast";
import { UnreadCommentGate } from "@components/notifications/unread-comment-gate";
import "./style.css";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { usePathname } from "next/navigation";

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const pathname = usePathname();

  // Check if current page is a board page (needs overflow hidden for drag & drop)
  const isBoardPage = /^\/workspace\/[^/]+\/board\/[^/]+/.test(pathname);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render the layout during SSR
  if (!isClient) {
    return <div>{children}</div>;
  }

  return (
    <Layout className="base-layout">
      <Header style={{ position: "fixed", zIndex: 500, width: "100%" }}>
        <TopBar />
      </Header>
      <Sidebar />
      <Layout
        className="workspace-layout"
        style={{
          marginTop: "45px",
          width: collapsed
            ? `calc(100% - ${siderSmall}px)`
            : `calc(100% - ${siderWide}px)`,
          minWidth: 0,
          maxWidth: "100%",
          transition: "margin-left 0.2s ease",
          height: "calc(100dvh - 45px)",
          overflow: isBoardPage ? "hidden" : "auto",
          overflowX: "hidden",
          overscrollBehaviorY: isBoardPage ? "none" : "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Content
          style={{
            height: isBoardPage ? "100%" : "auto",
            minHeight: isBoardPage ? "100%" : "calc(100dvh - 45px)",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: isBoardPage ? "hidden" : "visible",
          }}
        >
          <div style={{
            flex: 1,
            minWidth: 0,
            overflow: isBoardPage ? "hidden" : "visible",
            minHeight: isBoardPage ? "auto" : "100%"
          }}>
            {children}
          </div>
        </Content>
      </Layout>
      <ChatWidget />
      <ChatNotificationToast />
      <NotulensiToast />
      <UnreadCommentGate />
    </Layout>
  );
};

export default WorkspaceLayout;

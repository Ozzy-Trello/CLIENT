"use client";
import { ReactNode, useEffect, useState } from "react";
import { Alert, Button, Layout } from "antd";
import TopBar from "@components/topbar";
import Sidebar from "@components/sidebar";
import ChatWidget from "@components/chat/chat-widget";
import ChatNotificationToast from "@components/chat/chat-notification-toast";
import NotulensiToast from "@components/notifications/notulensi-toast";
import DailyActivityLockBanner from "@components/daily-activity/daily-activity-lock-banner";
import { UnreadCommentGate } from "@components/notifications/unread-comment-gate";
import "./style.css";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDailyActivityAccessStatus } from "@api/daily-activity";

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const accessQuery = useQuery({ queryKey: ["daily-activity-access-status"], queryFn: getDailyActivityAccessStatus, retry: false });
  const isDailyActivityPage = pathname?.includes("/daily-activity") || false;
  const shouldRedirectForDaily = accessQuery.data?.locked === true && !isDailyActivityPage;

  // Check if current page is a board page (needs overflow hidden for drag & drop)
  const isBoardPage = /^\/workspace\/[^/]+\/board\/[^/]+/.test(pathname);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!shouldRedirectForDaily || !workspaceId) return;
    router.replace(`/workspace/${workspaceId}/daily-activity`);
  }, [router, shouldRedirectForDaily, workspaceId]);

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
            {shouldRedirectForDaily ? <Alert className="m-4" type="warning" showIcon message={`Daily Activity ${accessQuery.data?.oldest_missed_date || "belum terpenuhi"}. Akses menu lain terkunci.`} action={<Link href={`/workspace/${workspaceId}/daily-activity`}><Button size="small">Buka Daily Activity</Button></Link>} /> : children}
          </div>
        </Content>
      </Layout>
      <ChatWidget />
      <ChatNotificationToast />
      <DailyActivityLockBanner />
      <NotulensiToast />
      <UnreadCommentGate />
    </Layout>
  );
};

export default WorkspaceLayout;

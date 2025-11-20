"use client";
import { ReactNode, useEffect, useState } from "react";
import { Layout, Menu } from "antd";
import TopBar from "@components/topbar";
import Sidebar from "@components/sidebar";
import "./style.css";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { usePathname } from "next/navigation";

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const { collapsed, siderSmall, siderWide, isCompact } =
    useWorkspaceSidebar();
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
      <Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
        <TopBar />
      </Header>
      <Sidebar />
      <Layout
        className="workspace-layout"
        style={{
          marginTop: "45px",
          width: isCompact
            ? "100%"
            : collapsed
              ? `calc(100% - ${siderSmall}px)`
              : `calc(100% - ${siderWide}px)`,
          transition: "margin-left 0.2s ease",
          height: "calc(100vh - 45px)",
          overflow: isBoardPage ? "hidden" : "auto",
        }}
      >
        <Content
          style={{
            height: isBoardPage ? "100%" : "auto",
            minHeight: isBoardPage ? "100%" : "calc(100vh - 45px)",
            display: "flex",
            flexDirection: "column",
            overflow: isBoardPage ? "hidden" : "visible",
          }}
        >
          <div style={{ 
            flex: 1, 
            overflow: isBoardPage ? "hidden" : "visible",
            minHeight: isBoardPage ? "auto" : "100%"
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkspaceLayout;

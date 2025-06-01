"use client";
import { ReactNode } from "react";
import { Layout, Menu } from "antd";
import TopBar from "@components/topbar";
import Sidebar from "@components/sidebar";
import "./style.css";
import {
  useWorkspaceSidebar,
} from "@providers/workspace-sidebar-context";

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();

  return (
    <Layout className="base-layout">
      <Header style={{ position: 'fixed', zIndex: 1, width: '100%' }}>
        <TopBar />
      </Header>
      <Sidebar />
      <Layout
        className="workspace-layout"
        style={{
          marginTop: "45px",
          width: collapsed ? `calc(100%-${siderSmall})` : `calc(100%-${siderWide}) `,
          transition: "margin-left 0.2s ease",
          height: "calc(100vh - 45px)",
          overflow: "hidden",
        }}
      >
        <Content style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkspaceLayout;
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Layout, Menu } from "antd";
import TopBar from "../components/topbar";
import Sidebar from "../components/sidebar";
import "./style.css";
import {
  useWorkspaceSidebar,
  WorkspaceSidebarProvider,
} from "./workspace-sidebar-context";

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  
  const { siderWidth } = useWorkspaceSidebar();

  return (
    <Layout className="base-layout">
      <Header>
        <TopBar />
      </Header>

      <Sidebar />
      <Layout
        style={{
          marginTop: 50,
          marginLeft: siderWidth,
          transition: "margin-left 0.2s ease",
          overflow: "hidden",
        }}
      >
        <Content>{children}</Content>
      </Layout>
    </Layout>
  );
};

export default WorkspaceLayout;

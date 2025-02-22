"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Layout, Menu } from "antd";
import TopBar from "../components/topbar";
import Sidebar from "../components/sidebar";
import "./style.css";
import {
  useWorkspaceSidebar,
  WorkspaceSidebarProvider,
} from "@/app/provider/workspace-sidebar-context";
import Footer from "../components/footer";

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();

  return (
    <Layout className="base-layout">
      <Header>
        <TopBar />
      </Header>

      <Sidebar />
      <Layout
        style={{
          marginTop: 45,
          marginLeft: collapsed ? siderSmall : siderWide,
          transition: "margin-left 0.2s ease",
          overflow: "hidden",
          height: "100vh"
        }}
      >
        <Content>
          {children}
          <Footer />
        </Content>
      </Layout>
    </Layout>
  );
};

export default WorkspaceLayout;

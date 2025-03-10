"use client";

import { ReactNode } from "react";
import { Layout, Menu } from "antd";
import TopBar from "../components/topbar";
import "./style.css";
import {
  useWorkspaceSidebar,
} from "@/app/provider/workspace-sidebar-context";
import Footer from "../components/footer";
import Sidebar from "../components/sidebar";

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

      <Layout>
        <Sidebar />
        <Layout
          style={{
            marginTop: "45px !important",
            width: collapsed ? `calc(100%-${siderSmall})` : `calc(100%-${siderWide}) `,
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
    </Layout>
  );
};

export default WorkspaceLayout;

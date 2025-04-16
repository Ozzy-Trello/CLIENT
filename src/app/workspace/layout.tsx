"use client";

import { ReactNode } from "react";
import { Layout, Menu } from "antd";
import TopBar from "../components/topbar";
import Sidebar from "../components/sidebar";
import "./style.css";
import {
  useWorkspaceSidebar,
} from "@/app/provider/workspace-sidebar-context";
import Footer from "../components/footer";
// import UrlSynchronizer from "./url_synchronizer"; still error, needs to fix later

const { Header, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();

  return (
    <Layout className="base-layout">
      {/* <UrlSynchronizer /> */}
      <Header>
        <TopBar />
      </Header>

      <Sidebar />
      <Layout
        className="workspace-layout"
        style={{
          marginTop: "45px",
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
  );
};

export default WorkspaceLayout;

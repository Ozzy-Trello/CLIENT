"use client";

import { ReactNode, useEffect, useState } from "react";
import { Layout, Menu } from "antd";
import TopBar from "../components/topbar";
import Sidebar from "../components/sidebar";


const { Header, Sider, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const WorkspaceLayout: React.FC<BaseLayoutProps> = ({ children }) => {

  const SIDERWIDTH_SMALL = 25;
  const SIDERWIDTH_WIDE = 200;
  const [collapsed, setCollapsed] = useState(false);
  const [siderWidth, setSiderWidth] = useState(SIDERWIDTH_WIDE);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      const innerWidth = window.innerWidth;
      setScreenWidth(innerWidth);
    };
  
    window.addEventListener('resize', handleResize);
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (collapsed) {
      setSiderWidth(SIDERWIDTH_SMALL);
    } else {
      setSiderWidth(SIDERWIDTH_WIDE);
    }
  }, [collapsed])

  return (
    <Layout className="base-layout" style={{ minHeight: "100vh", overflow: "hidden" }}>
      <Header style={{position:"fixed", width: "100%", height: "50px", borderWidth: "1px 0 1px 0px", borderStyle:"solid", borderColor: "#434343"}}>
        <TopBar />
      </Header>

      <Layout>
        {/* Sidebar */}
        <Sider
          trigger={null} collapsible collapsed={collapsed}
          style={{
            height: `calc(100vh - 50px)`, // Adjust height to account for the topbar
            position: "fixed",
            left: 0,
            top: 50, // Position below the topbar
            zIndex: 10,
            overflow: "auto",
          }}
          width={siderWidth}
        >
          <Sidebar />
        </Sider>

        {/* Main Content */}
        <Layout
          style={{
            marginTop: 50,
            marginLeft: siderWidth, // Matches the sidebar width
            overflow: "hidden",
          }}
        >
          <main
            style={{
              overflow: "hidden",
              minHeight: "calc(100vh - 50px)"
            }}
          >
            <Content>{children}</Content>
          </main>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default WorkspaceLayout;

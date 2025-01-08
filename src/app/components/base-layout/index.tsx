"use client";

import { ReactNode } from "react";
import { Layout, Menu } from "antd";
import { HomeOutlined, UserOutlined, SettingOutlined } from "@ant-design/icons";
import "./styles.css";

const { Header, Sider, Content } = Layout;

interface BaseLayoutProps {
  children: ReactNode;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  return (
    <Layout className="base-layout" style={{ minHeight: "100vh" }}>
      <Sider collapsible width={200} className="site-layout-background">
        <Menu
          mode="inline"
          defaultSelectedKeys={["1"]}
          style={{ height: "100%", borderRight: 0 }}
        >
          <Menu.Item key="1" icon={<HomeOutlined />}>
            Home
          </Menu.Item>
          <Menu.Item key="2" icon={<UserOutlined />}>
            Users
          </Menu.Item>
          <Menu.Item key="3" icon={<SettingOutlined />}>
            Settings
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header className="site-layout-background" style={{ padding: 0 }}>
          <h1 style={{ color: "white", textAlign: "center" }}>
            Ozzy Workflow Manager
          </h1>
        </Header>
        <Content style={{ margin: "0 16px" }}>{children}</Content>
      </Layout>
    </Layout>
  );
};

export default BaseLayout;

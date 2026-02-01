"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { MenuProps } from "antd";
import { Button, Layout, Menu, Typography } from "antd";
import { Bot, SlidersHorizontal, X } from "lucide-react";
import styled from "styled-components";

const { Header, Content, Footer, Sider } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

const siderStyle: React.CSSProperties = {
  overflow: "auto",
  height: "100%",
  position: "relative",
  insetInlineStart: 0,
  top: 0,
  bottom: 0,
  scrollbarWidth: "thin",
  scrollbarGutter: "stable",
  backgroundColor: "#F7F8F9",
};

const AutomationLayout = ({ children }: { children: React.ReactNode }) => {
  const { workspaceId, boardId } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  // Determine which menu item should be selected based on current path
  const getSelectedKeys = () => {
    if (pathname.includes('/automation/custom-buttons')) {
      return ['card-button-1'];
    }
    if (pathname.includes('/automation/rules')) {
      return ['automation-1'];
    }
    return ['automation-1']; // default to rules
  };

  const items: MenuItem[] = [
    {
      key: "automation",
      label: "Automation",
      type: "group",
      children: [
        {
          key: `automation-1`,
          label: (
            <Link
              className="block w-full"
              href={`/workspace/${workspaceId}/board/${boardId}/automation/rules`}
            >
              Rules
            </Link>
          ),
          icon: <SlidersHorizontal size={16} />,
        },
      ],
    },
    {
      key: "custom-buttons",
      label: "Card Buttons",
      type: "group",
      children: [
        {
          key: `card-button-1`,
          label: (
            <Link
              className="block w-full"
              href={`/workspace/${workspaceId}/board/${boardId}/automation/custom-buttons`}
            >
              Card Buttons
            </Link>
          ),
          icon: <SlidersHorizontal size={16} />,
        },
      ],
    },
  ];

  return (
    <Layout
      hasSider
      className="h-full shadow rounded-md bg-white"
      style={{
        margin: "16px",
        height: "calc(100% - 32px)",
        overflow: "hidden",
      }}
    >
      <Sider style={siderStyle}>
        <div className="flex items-center justify-start gap-2 p-4">
          <Bot />
          <Typography.Title level={5} style={{ margin: 0 }}>
            Automation
          </Typography.Title>
        </div>
        <Menu
          className="automation-page-menu"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={items}
          style={{ background: "transparent" }}
        />
      </Sider>
      <Content
        style={{
          height: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            padding: "20px",
            height: "100%",
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </Content>
    </Layout>
  );
};
export default AutomationLayout;

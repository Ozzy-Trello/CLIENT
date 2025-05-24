"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { MenuProps } from 'antd';
import { Button, Layout, Menu, Typography } from 'antd';
import { Bot, SlidersHorizontal, X } from "lucide-react";

const { Header, Content, Footer, Sider } = Layout;
type MenuItem = Required<MenuProps>['items'][number];

const siderStyle: React.CSSProperties = {
  overflow: 'auto',
  height: '100%',
  position: 'relative',
  insetInlineStart: 0,
  top: 0,
  bottom: 0,
  scrollbarWidth: 'thin',
  scrollbarGutter: 'stable',
  backgroundColor: '#F7F8F9'
};

const AutomationLayout = ({ children }: { children: React.ReactNode }) => {
  const { workspaceId, boardId } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const items: MenuItem[] = [
    {
      key: 'automattion',
      label: 'Automation',
      type: 'group',
      children: [
        {
          key: `automation-1`,
          label: (
            <Link className="block w-full" href={`/workspace/${workspaceId}/board/${boardId}/automation/rules`}>
              Rules
            </Link>
          ),
          icon: <SlidersHorizontal size={16}/>,
        },
      ],
    },
    {
      key: 'custom-buttons',
      label: 'Custom Buttons',
      type: 'group',
      children: [
        {
          key: `custom-button-1`,
          label: (
            <Link className="block w-full" href={`/workspace/${workspaceId}/board/${boardId}/automation/custom-buttons`}>
              Custom Buttons
            </Link>
          ),
          icon: <SlidersHorizontal size={16}/>,
        },
      ]
    }
  ];


  return (
    <Layout hasSider className="h-full shadow rounded-md bg-white" style={{
      margin: '16px',
      height: 'calc(100% - 32px)',
      overflow: 'hidden',
    }}>
      <Sider style={siderStyle}>
        <div className="flex items-center justify-start gap-2 p-4">
          <Bot />
          <Typography.Title level={5} style={{ margin: 0 }}>
            Automation
          </Typography.Title>
        </div>
        <Menu mode="inline" defaultSelectedKeys={['automation-1']} items={items} style={{background: "transparent"}} />
      </Sider>
      <Content style={{
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10
        }}>
          <Button type="text"><X size={24} /></Button>
        </div>
        <div style={{
          padding: '20px',
          height: '100%',
          overflow: 'auto'
        }}>
          {children}
        </div>
      </Content>
    </Layout>
  )
};

export default AutomationLayout;
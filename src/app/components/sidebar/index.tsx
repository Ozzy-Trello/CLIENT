'use client';

import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { Board } from "@/app/dto/types";
import { boards } from "@/dummy-data";
import { Avatar, Button, Menu, Tooltip, Typography, Layout, Skeleton, Space } from "antd";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trello, Users } from "lucide-react";
import "./style.css";
import { calc } from "antd/es/theme/internal";

const menus = [
  {
    key: "menu-board",
    label: (
      <Link className="fullwidth" href={"/workspace/boards"}>
        Boards
      </Link>
    ),
    icon: <Trello size={16}/>,
  },
  {
    key: "menu-members",
    label: (
      <Link className="fullwidth" href={"/workspace/members"}>
        Members
      </Link>
    ),
    icon: <Users size={16} />,
  }
];

const { Sider } = Layout;

const Sidebar: React.FC = React.memo(() => {
  const { collapsed, toggleSidebar, siderWide, siderSmall } = useWorkspaceSidebar();
  const [boardList, setBoardList] = useState<Board[]>([]);
  const [items, setItems] = useState(menus);
  const [isFetching, setIsFetching] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchBoardsList = () => {
      setBoardList(boards);
    }
    if (isFetching) {
      setTimeout(function(){
        fetchBoardsList();
        setIsFetching(false);
      }, 1000);
    }
  }, [isFetching]);

  useEffect(() => {
    const updateMenu = () => {
      const boardMenus: any[] = [];
      boardMenus.push({
        key: `menu-your-boards`,
        event: 'none',
        disabled: true,
        label: (
          <div className={collapsed ? "fx-h-sb-center d-none" : "fx-h-sb-center"}>
            <Typography.Text strong>Your boards</Typography.Text>
            <Button size="small">+</Button>
          </div>
        )
      });

      boardList?.forEach((board) => {
        const boardMenu = {
          key: `menu-board-${board.id}`,
          label: (
            <Link className="fullwidth" href={`/workspace/boards/${board.id}`}>
              {board.title}
            </Link>
          ),
          icon: <span><Avatar shape="square" src={board?.cover} size={"small"}/></span>,
        }
        boardMenus.push(boardMenu);
      });
   
      setItems([...menus, ...boardMenus]);
    };
   
    updateMenu();
   
  }, [boardList, collapsed]);

  return (
    <div 
      className="sidebar-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Sider
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        collapsed={collapsed}
        style={{
          height: '100%',
          position: 'fixed',
          left: 0,
          top: 45,
          overflow: 'visible',
          backgroundColor: '#fff',
          transition: 'width 0.2s ease, transform 0.2s ease',
          width: collapsed ? siderSmall : siderWide,
          zIndex: 101
        }}
        width={collapsed ? siderSmall : siderWide}
        collapsedWidth={12}
        trigger={null}
      >
        <div className="sidebar-content" style={{ opacity: collapsed ? 0 : 1 }}>
          {!collapsed && (
            <>
              <div className="sidebar-title">
                <div className="fx-h-left-center">
                  <Avatar shape="square" size={"small"} />
                  <Typography>Workspace Name</Typography>
                </div>
              </div>
              
              <Menu
                mode="inline"
                defaultSelectedKeys={["1"]}
                style={{ borderRight: 0 }}
                items={items}
              />

              {isFetching && [1,2,3].map((item) => (
                <Space key={`loader-space-${item}`} style={{margin: "0px 0px 10px 25px"}}>
                  <Skeleton.Avatar active={isFetching} size={"small"} shape={"square"} />
                  <Skeleton.Input active={isFetching} size={"small"} />
                </Space>
              ))}
            </>
          )}
        </div>
      </Sider>

      <Tooltip 
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        placement="right"
      >
        <Button
          className={`sidebar-toggle ${isHovered ? 'hovered' : ''}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          size="small"
          type="text"
          icon={collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          onClick={toggleSidebar}
          style={{
            left: collapsed ? `calc(${siderSmall}px - 10px)` : `calc(${siderWide}px - 30px)`,
            zIndex: 102
          }}
        />
      </Tooltip>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
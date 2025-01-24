import { useWorkspaceSidebar } from "@/app/workspace/workspace-sidebar-context";
import { Avatar, Button, Menu, Tooltip, Typography, Layout } from "antd";
import Link from "next/link";
import React, { useState } from "react";

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const { collapsed, toggleSidebar, siderWidth } = useWorkspaceSidebar();

  const [boards, setBoards] = useState([
    { id: 1, title: "Trello clone project" },
    { id: 2, title: "E-commerce project" },
    { id: 3, title: "company profile project" },
  ]);

  const items = [
    {
      key: "menu-board",
      label: (
        <Link className="fullwidth" href={"/workspace/boards"}>
          Boards
        </Link>
      ),
      icon: <i className="fi fi-brands-trello"></i>,
    },
    {
      key: "menu-home",
      label: (
        <Link className="fullwidth" href={"/workspace/home"}>
          Home
        </Link>
      ),
      icon: <i className="fi fi-rr-home"></i>,
    },
    {
      key: "menu-workspace-settings",
      label: (
        <Link className="fullwidth" href={"/workspace/settings"}>
          Workspace settings
        </Link>
      ),
      icon: <i className="fi fi-rr-settings"></i>,
    },
    ...(collapsed
      ? []
      : [
          {
            key: "divider-1",
            label: (
              <>
                <hr />
                <b>Workspace View</b>
              </>
            ),
            icon: null,
          },
        ]),
    {
      key: "menu-workspace-v-table",
      label: (
        <Link className="fullwidth" href={"/workspace/views/table"}>
          Table
        </Link>
      ),
      icon: <i className="fi-rs-table-list"></i>,
    },
    {
      key: "menu-workspace-v-calendar",
      label: (
        <Link className="fullwidth" href={"/workspace/views/calendar"}>
          Calendar
        </Link>
      ),
      icon: <i className="fi-tr-calendar-days"></i>,
    },
    ...(collapsed
      ? []
      : [
          {
            key: "divider-2",
            label: (
              <>
                <hr />
                <b>Your Boards</b>
              </>
            ),
            icon: null,
          },
        ]),
    ...boards.map((board) => ({
      key: `board-item-${board.title}`,
      label: (
        <Link className="fullwidth" href={"/workspace/board"}>
          {board.title}
        </Link>
      ),
      icon: <Avatar shape="square" size={"small"} />,
    })),
  ];

  return (
    <Sider
      className="sidebar"
      collapsed={collapsed}
      style={{
        height: `100%`,
        position: "fixed",
        left: 0,
        top: 50,
        zIndex: 10,
        overflow: "auto",
      }}
      width={siderWidth}
      trigger={null}
    >
      <div
        className="sidebar-title"
        style={{
          display: "flex",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "10px",
        }}
      >
        {!collapsed && (
          <div className="fx-h-left-center">
            <Avatar shape="square" size={"small"} />
            <Typography>Workspace Name</Typography>
          </div>
        )}
        <Tooltip title="toggle">
          <Button
            size="small"
            shape="default"
            icon={
              <i
                className={`fi fi-rr-angle-small-${
                  collapsed ? "right" : "left"
                }`}
              />
            }
            onClick={() => toggleSidebar()}
          />
        </Tooltip>
      </div>
      <Menu
        mode="inline"
        defaultSelectedKeys={["1"]}
        style={{ height: "100%", borderRight: 0 }}
        items={items}
      />
    </Sider>
  );
};

export default Sidebar;

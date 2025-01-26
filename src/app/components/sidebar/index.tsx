import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { Board } from "@/app/types";
import { boards } from "@/dummy-data";
import { Avatar, Button, Menu, Tooltip, Typography, Layout, Divider } from "antd";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const menus = [
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
    key: "menu-members",
    label: (
      <Link className="fullwidth" href={"/workspace/boards"}>
        Members
      </Link>
    ),
    icon: <i className="fi fi-sr-user-add"></i>,
  }
];

const { Sider } = Layout;

const Sidebar: React.FC = () => {

  const { collapsed, toggleSidebar, siderWidth } = useWorkspaceSidebar();
  const [boardList, setBoardList] = useState<Board[]>(boards);
  const [items, setItems] = useState(menus);

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

      boardList?.forEach((board, index) => {
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

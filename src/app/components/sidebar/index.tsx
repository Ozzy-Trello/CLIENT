import { useWorkspaceSidebar } from "@/app/workspace/workspace-sidebar-context";
import { Avatar, Button, Divider, Menu, Tooltip, Typography, Layout } from "antd";
import Link from "next/link";
import React, {useState } from "react";

const { Sider } = Layout;

const Sidebar: React.FC = () => {

  const { collapsed, toggleSidebar, siderWidth } = useWorkspaceSidebar();

  const [boards, setBoards] = useState([
    {
      id: 1,
      title: "Trello clone project"
    },
    {
      id: 2,
      title: "E-commerce project"
    },
    {
      id: 3,
      title: "company profile project"
    }
  ])

  return (
    <Sider
      collapsed={collapsed}
      style={{
        height: `100%`, // Adjust height to account for the topbar
        position: "fixed",
        left: 0,
        top: 50, // Position below the topbar
        zIndex: 10,
        overflow: "auto",
      }}
      width={siderWidth}
    >
      <Menu
        mode="inline"
        defaultSelectedKeys={["1"]}
        style={{ height: "100%", borderRight: 0 }}
      >
        <div style={{display: "flex", justifyContent:"space-between", padding:"10px"}}>
          { !collapsed && (
            <div className="item-h-l">
              <Avatar shape="square" size={"small"}/>
              <Typography>Workspace Name</Typography>
            </div>
          )}
          <Tooltip title="search">
            <Button size="small" shape="default" icon={<i className="fi fi-rr-angle-small-left"></i>} onClick={() => (toggleSidebar())} />
          </Tooltip>
        </div>

        <Divider />

        <Menu.Item key="menu-board" icon={<i className="fi fi-brands-trello"></i>}>
          <Link className="fullwidth" href={"/workspace/boards"}>Boards</Link>
        </Menu.Item>

        <Menu.Item key="menu-home" icon={<i className="fi fi-rr-home"></i>}>
          <Link className="fullwidth" href={"/workspace/home"}>Home</Link>
        </Menu.Item>

        <Menu.Item key="menu-workspace-settings" icon={<i className="fi fi-rr-settings"></i>}>
          <Link className="fullwidth" href={"/workspace/settings"}>Workspace settings</Link>
        </Menu.Item>

        <Divider />

        {!collapsed && (<Typography.Text style={{padding: 10}}>Worksapce views</Typography.Text>)}

        <Menu.Item key="menu-workspace-v-table" icon={<i className="fi fi-rs-table-list"></i>}>
          <Link className="fullwidth" href={"/workspace/views/table"}>Table</Link>
        </Menu.Item>

        <Menu.Item key="menu-workspace-v-calendar" icon={<i className="fi fi-tr-calendar-days"></i>}>
          <Link className="fullwidth" href={"/workspace/views/calendar"}>Calendar</Link>
        </Menu.Item>

        <Divider />

        {!collapsed && (<Typography.Text style={{padding: 10}}>Your boards</Typography.Text>)}

        {
          boards?.map((board, index) => (
            <Menu.Item key={`board-item-${board?.title}`} icon={<Avatar shape="square" size={"small"}/>}>
              <Link className="fullwidth" href={"/workspace/board"}>{board?.title}</Link>
            </Menu.Item>
          ))
        }
      </Menu>
    </Sider>
  )
}

export default Sidebar;
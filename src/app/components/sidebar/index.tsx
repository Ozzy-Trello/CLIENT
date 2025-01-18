import { Avatar, Button, Divider, Menu, Tooltip, Typography } from "antd"
import { useState } from "react"


const Sidebar: React.FC = () => {

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
    <Menu
      mode="inline"
      defaultSelectedKeys={["1"]}
      style={{ height: "100%", borderRight: 0 }}
    >
      <div style={{display: "flex", justifyContent:"space-between", padding:"10px"}}>
        <div style={{display: "flex", alignItems: "center", gap:2}}>
          <Avatar shape="square" size={"small"}/>
          <Typography>Workspace Name</Typography>
        </div>
        <Tooltip title="search">
          <Button size="small" type="primary" shape="default" icon={<i className="fi fi-rr-angle-small-left"></i>} />
        </Tooltip>
      </div>

      <Divider />

      <Menu.Item key="menu-board" icon={<i className="fi fi-brands-trello"></i>}>
        Boards
      </Menu.Item>
      <Menu.Item key="menu-home" icon={<i className="fi fi-rr-home"></i>}>
        Home
      </Menu.Item>
      <Menu.Item key="menu-workspace-settings" icon={<i className="fi fi-rr-settings"></i>}>
        Workspace settings
      </Menu.Item>

      <Divider />

      <Typography.Text style={{padding: 10}}>Worksapce views</Typography.Text>

      <Menu.Item key="menu-workspace-v-table" icon={<i className="fi fi-rs-table-list"></i>}>
        Table
      </Menu.Item>

      <Menu.Item key="menu-workspace-v-calendar" icon={<i className="fi fi-tr-calendar-days"></i>}>
        Calendar
      </Menu.Item>

      <Divider />

      <Typography.Text style={{padding: 10}}>Your boards</Typography.Text>

      {
        boards?.map((board, index) => (
          <Menu.Item key={`board-item-${board?.title}`} icon={<Avatar shape="square" size={"small"}/>}>
            {board?.title}
          </Menu.Item>
        ))
      }
    </Menu>
  )
}

export default Sidebar
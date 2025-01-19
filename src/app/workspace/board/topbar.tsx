import { Avatar, Button, Tooltip, Typography } from "antd"
import { useState } from "react";
import { useWorkspaceSidebar } from "../workspace-sidebar-context";


const Topbar: React.FC = () => {

  const {siderWidth} = useWorkspaceSidebar();

  const [members, setMembers] = useState([
    {
      id: "1",
      name: "John Doe",
      avatar: ""
    },
    {
      id: "1",
      name: "Jane Doe",
      avatar: ""
    }
  ])

  return (
    <div 
      style={{
        display:"flex", 
        alignItems:"center", 
        justifyContent:"space-between", 
        height:"50px",
        width: `calc(100% - ${siderWidth}px)`,
        position: "fixed",
        top: 50,
        padding: "5px 20px",
        color: "#fff",
        background:"#08124c",
        borderWidth: "1px 0 1px 0px", borderStyle:"solid", borderColor: "#434343",
        zIndex:1000
      }}
    >
      <div style={{display:"flex", alignItems:"center", gap:10}}>
        <Typography.Title level={4} style={{color: "#fff"}}>Board Title</Typography.Title>
        <Tooltip title={"Starred boards showed up at the top of your baord list"}>
          <Button size="small" shape="default"><i className="fi fi-rr-star"></i></Button>
        </Tooltip>
        <Tooltip title={"Starred boards showed up at the top of your baord list"}>
          <Button size="small" shape="default"><i className="fi fi-rr-users"></i></Button>
        </Tooltip>
      </div>

      <div  style={{display:"flex", alignItems:"center"}}>
        <Tooltip title={"Starred boards showed up at the top of your baord list"}>
          <Button size="small" shape="default"><i className="fi fi-br-bars-filter"></i><span>Filter</span></Button>
        </Tooltip>
        <div className="members">
          {
            members?.map((member, index) => (
              <Avatar size={"small"}/>
            ))
          }
        </div>
        <Tooltip>
          <Button size="small"><i className="fi fi-rr-user-add"></i> <span>Share</span></Button>
        </Tooltip>
      </div>
    </div>
  )
}

export default Topbar;
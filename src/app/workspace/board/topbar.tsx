import { Avatar, Button, theme, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useWorkspaceSidebar } from "../workspace-sidebar-context";

const Topbar: React.FC = () => {
  const { siderWidth } = useWorkspaceSidebar();

  const [members, setMembers] = useState([
    {
      id: "1",
      name: "John Doe",
      avatar: "",
    },
    {
      id: "1",
      name: "Jane Doe",
      avatar: "",
    },
  ]);

  return (
    <div 
      className="board-page-topbar fx-h-sb-center"
      style={{
        width: `calc(100% - ${siderWidth}px)`,
        height: "50px",
        top: 50,
      }}
    >
      <div className="fx-h-left-center">
        <Typography.Title level={4} className="m-0">
          Board Title
        </Typography.Title>
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Button size="small" shape="default">
            <i className="fi fi-rr-star"></i>
          </Button>
        </Tooltip>
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Button size="small" shape="default">
            <i className="fi fi-rr-users"></i>
          </Button>
        </Tooltip>
      </div>

      <div className="fx-h-right-center">
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Button size="small" shape="default">
            <i className="fi fi-br-bars-filter"></i>
            <span>Filter</span>
          </Button>
        </Tooltip>
        <div className="members">
          {members?.map((member, index) => (
            <Avatar key={index} size={"small"} />
          ))}
        </div>
        <Tooltip>
          <Button size="small">
            <i className="fi fi-rr-user-add"></i> <span>Share</span>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default Topbar;

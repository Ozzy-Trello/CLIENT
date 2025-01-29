import { Avatar, Button, Dropdown, MenuProps, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { getUserById } from "@/dummy-data";
import { useScreenSize } from "@/app/provider/screen-size-provider";
import MembersList from "@/app/components/members-list";

const Topbar: React.FC = () => {
  const { siderWidth } = useWorkspaceSidebar();
  const {width} = useScreenSize();
  const [ showRightColMenu, setIsShowRighColtMenu ] = useState(false);
  const [ openRightMenu, setOpenRightMenu] = useState(false);

  const [members, setMembers] = useState([
    getUserById('1'),
    getUserById('2'),
    getUserById('3'),
    getUserById('4'),
    getUserById('5')
  ]);


  useEffect(() => {

    const handleRightColMenu = () => {
      if (width < 768) {
        setIsShowRighColtMenu(false);
      } else {
        setIsShowRighColtMenu(true);
      }
    }

    handleRightColMenu();

  }, [width])


  const rightMenu: MenuProps["items"] = [
    { 
      key: "filter", 
      label:  
        <Tooltip
          title={"filter"}
        >
          <Button size="small" shape="default">
            <i className="fi fi-br-bars-filter"></i>
            <span>Filter</span>
          </Button>
        </Tooltip> 
    },
    {
      key: "members", 
      label: "Members"
    },
    {
      key: "share", 
      label: "Share"
    },
  ];

  return (
    <div 
      className="board-page-topbar fx-h-sb-center"
      style={{
        width: `calc(100% - ${siderWidth}px)`,
        height: "50px",
        top: 50,
      }}
    >
      <div className="fx-h-left-center left-col">
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

      <div className="right-col">
        { showRightColMenu  ? (
          <div className="fx-h-right-center">
            <Tooltip title={"filter"}>
              <Button size="small" shape="default">
                <i className="fi fi-br-bars-filter"></i>
                <span>Filter</span>
              </Button>
            </Tooltip> 
            <div className="members">
              <MembersList members={members} membersLength={members.length} membersLoopLimit={2} />
            </div>
            <Tooltip>
              <Button size="small">
                <i className="fi fi-rr-user-add"></i> <span>Share</span>
              </Button>
            </Tooltip>
          </div>
          ) : (
            <Dropdown
              menu={{items: rightMenu}}
              trigger={["click"]}
              open={openRightMenu}
              onOpenChange={setOpenRightMenu}
            >
              <Tooltip title={"show more menu"}>
                  <Button><i className="fi fi-br-menu-burger"></i></Button>
                </Tooltip>
            </Dropdown>
          )}
      </div>
    </div>
  );
};

export default Topbar;

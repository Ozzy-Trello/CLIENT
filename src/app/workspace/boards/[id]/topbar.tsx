import { Avatar, Button, Dropdown, MenuProps, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { getUserById } from "@/dummy-data";
import { useScreenSize } from "@/app/provider/screen-size-provider";
import MembersList from "@/app/components/members-list";
import { ListFilter, Menu, SlidersHorizontal, Star, UserPlus, Users } from "lucide-react";

const Topbar: React.FC = () => {
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
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
            <SlidersHorizontal />
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
        width: collapsed ? `calc(100% - ${siderSmall}px)` : `calc(100% - ${siderWide}px)`,
        height: "45px",
        top: 45,
      }}
    >
      <div className="fx-h-left-center left-col">
        <Typography.Title level={4} className="m-0">
          Request Design
        </Typography.Title>
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Star size={16} cursor={"pointer"}/>
        </Tooltip>
        <Tooltip
          title={"Change board visibility"}
        >
          <Users size={16} cursor={"pointer"} />
        </Tooltip>
      </div>

      <div className="right-col">
        { showRightColMenu  ? (
          <div className="fx-h-right-center">
            <Tooltip title={"filter"}>
              <Button size="small" shape="default" icon={<ListFilter size={16} />}>
                <span>Filter</span>
              </Button>
            </Tooltip> 
            <div className="members">
              <MembersList members={members} membersLength={members.length} membersLoopLimit={2} />
            </div>
            <Tooltip title="Share board">
              <Button size="small" icon={<UserPlus size={16}/>}>
                <span>Share</span>
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
                  <Button><Menu size={16} /></Button>
                </Tooltip>
            </Dropdown>
          )}
      </div>
    </div>
  );
};

export default Topbar;

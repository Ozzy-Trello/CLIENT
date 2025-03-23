import { Button, Dropdown, MenuProps, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import MembersList from "@/app/components/members-list";
import { Ellipsis, ListFilter, Menu, SlidersHorizontal, Star, UserPlus, Users } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@/app/store/workspace_slice";

const Topbar: React.FC = () => {
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const [showRightColMenu, setIsShowRighColtMenu] = useState(false);
  const [openRightMenu, setOpenRightMenu] = useState(false);
  const currentBoard = useSelector(selectCurrentBoard);
  const [members, setMembers] = useState([
    // getUserById('1'),
    // getUserById('2'),
    // getUserById('3'),
    // getUserById('4'),
    // getUserById('5')
  ]);

  const rightMenu: MenuProps["items"] = [
    {
      key: "filter",
      label: (
        <Tooltip title={"filter"}>
          <Button size="small" shape="default">
            <SlidersHorizontal />
            <span>Filter</span>
          </Button>
        </Tooltip>
      )
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
      className="flex items-center justify-between h-[45px] absolute top-[45px] border-b border-gray-200 px-2"
      style={{
        width: collapsed ? `calc(100% - ${siderSmall}px)` : `calc(100% - ${siderWide}px)`
      }}
    >
      <div className="flex items-center gap-2">
        <Typography.Title level={4} className="m-0">
          {currentBoard ? currentBoard.name : "Board Title"}
        </Typography.Title>
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Star size={16} className="cursor-pointer" />
        </Tooltip>
        <Tooltip
          title={"Change board visibility"}
        >
          <Users size={16} className="cursor-pointer" />
        </Tooltip>
      </div>
      
      <div>
        {showRightColMenu ? (
          <div className="flex items-center justify-end gap-2">
            <Tooltip title={"filter"}>
              <Button size="small" shape="default" icon={<ListFilter size={16} />}>
                <span>Filter</span>
              </Button>
            </Tooltip>
            <div>
              <MembersList members={members} membersLength={members.length} membersLoopLimit={2} />
            </div>
            <Tooltip title="Share board">
              <Button size="small" icon={<UserPlus size={16}/>}>
                <span>Share</span>
              </Button>
            </Tooltip>
            <Tooltip title="more">
              <Button size="small" icon={<Ellipsis size={16} />}>
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
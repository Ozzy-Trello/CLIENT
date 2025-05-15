import { Button, Dropdown, MenuProps, Tooltip, Typography } from "antd";
import { Dispatch, SetStateAction, useState } from "react";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import MembersList from "@/app/components/members-list";
import {
  Ellipsis,
  ListFilter,
  Menu,
  SlidersHorizontal,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@/app/store/workspace_slice";
import ModalDashcard from "@/app/components/dashcard/modal-dashcard";

interface BoardTopbarProps {
  boardScopeMenuOpen: boolean;
  setBoardScopeMenuOpen: any;
  openDashcardModal: boolean; 
  setOpenDashcardModal: Dispatch<SetStateAction<boolean>>
}

const BoardTopbar: React.FC<BoardTopbarProps> = (props) => {
  const { boardScopeMenuOpen, setBoardScopeMenuOpen, openDashcardModal, setOpenDashcardModal } = props;
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const [ showRightColMenu, setIsShowRighColtMenu ] = useState(true);
  const [ openRightMenu, setOpenRightMenu ] = useState(false);
  const currentBoard = useSelector(selectCurrentBoard);
  const [ openAddMember, setOpenAddMember ] = useState<boolean>(false);

  const [members, setMembers] = useState([
    // getUserById('1'),
    // getUserById('2'),
    // getUserById('3'),
    // getUserById('4'),
    // getUserById('5')
  ]);

  const rightMenu: MenuProps["items"] = [
    {
      key: "track",
      label: (
        <Tooltip title={"track"}>
          <Button size="small" shape="default" variant="outlined">
            <span>10</span>
          </Button>
        </Tooltip>
      )
    },
    {
      key: "filter",
      label: (
        <Tooltip title={"filtering loh ini"}>
          <Button size="small" shape="default">
            <SlidersHorizontal />
            <span>Filter</span>
          </Button>
        </Tooltip>
      ),
    },
    {
      key: "members",
      label: "Members",
    },
    {
      key: "share",
      label: "Share",
    },
  ];

  return (
    <div
      className="flex items-center justify-between h-[45px] absolute top-[45px] border-b border-gray-200 px-2"
      style={{
        width: collapsed
          ? `calc(100% - ${siderSmall}px)`
          : `calc(100% - ${siderWide}px)`,
      }}
    >
      <div className="flex items-center gap-2 ml-5">
        <Typography.Title level={4} className="m-0">
          {currentBoard?.name}
        </Typography.Title>
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Star size={16} className="cursor-pointer" />
        </Tooltip>
        <Tooltip title={"Change board visibility"}>
          <Users size={16} className="cursor-pointer" />
        </Tooltip>
      </div>

      <div>
        {showRightColMenu ? (
          <div className="flex items-center justify-end gap-2">
            <Tooltip title={"track"}>
              <Button 
                size="small" 
                shape="default" 
                variant="text" 
                onClick={() => {
                  setOpenDashcardModal(true);
                }}>
                <div className="border rounded px-1 text-[7px]">10</div>
                <span>Track</span>
              </Button>
            </Tooltip>
            <Tooltip title={"filter"}>
              <Button
                size="small"
                shape="default"
                icon={<ListFilter size={16} />}
              >
                <span>Filter</span>
              </Button>
            </Tooltip>
            <div>
              <MembersList
                members={members}
                membersLength={members.length}
                membersLoopLimit={2}
                openAddMember={openAddMember} setOpenAddMember={setOpenAddMember}
              />
            </div>
            <Tooltip title="Share board">
              <Button size="small" icon={<UserPlus size={16} />}>
                <span>Share</span>
              </Button>
            </Tooltip>
            <Tooltip title="more">
              <Button
                type="text"
                size="small"
                icon={<Ellipsis size={16} />}
                onClick={() => {
                  setBoardScopeMenuOpen(true);
                }}
              ></Button>
            </Tooltip>
          </div>
        ) : (
          <Dropdown
            menu={{ items: rightMenu }}
            trigger={["click"]}
            open={openRightMenu}
            onOpenChange={setOpenRightMenu}
          >
            <Tooltip title={"show more menu"}>
              <Button>
                <Menu size={16} />
              </Button>
            </Tooltip>
          </Dropdown>
        )}
      </div>
    </div>
  );
};

export default BoardTopbar;

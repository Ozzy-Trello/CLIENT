import React, { useState } from "react";
import { Drawer, message } from "antd";
import {
  InfoCircleOutlined,
  InboxOutlined,
  SettingOutlined,
  FormOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { Bot } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@store/workspace_slice";
import BoardSettingsModal from "../board-settings-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateBoard } from "../../hooks/board";
import { Board } from "../../types/board";

interface BoardMenuSidebarProps {
  visible: boolean;
  setIsVisible: any;
}

interface MenuItemProps {
  icon: React.ReactNode;
  text: string;
  badge?: number | null;
  onClick?: () => void;
  divider?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  text,
  badge,
  onClick,
  divider = false,
}) => (
  <>
    <div
      className="flex items-center py-3 px-4 hover:bg-gray-100 cursor-pointer"
      onClick={onClick}
    >
      <div className="text-gray-700 mr-4">{icon}</div>
      <span className="text-gray-800 flex-grow">{text}</span>
      {badge && (
        <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {badge}
        </div>
      )}
    </div>
    {divider && <div className="h-px w-full bg-gray-200 my-2"></div>}
  </>
);

const BoardScopeMenu: React.FC<BoardMenuSidebarProps> = ({
  visible,
  setIsVisible,
}) => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const currentBoard = useSelector(selectCurrentBoard);
  const queryClient = useQueryClient();
  const resolvedWorkspaceId =
    typeof workspaceId === "string" ? workspaceId : workspaceId?.[0] || "";
  const { mutate: updateBoard } = useUpdateBoard(resolvedWorkspaceId);

  // State for settings modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const onClose = () => {
    setIsVisible(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsModalOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsModalOpen(false);
  };

  const handleBoardUpdate = (updatedData: Partial<Board>) => {
    if (!currentBoard) return;

    updateBoard(
      {
        boardId: currentBoard.id,
        board: updatedData,
      },
      {
        onSuccess: () => {
          message.success("Board updated successfully");
          queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
          queryClient.invalidateQueries({
            queryKey: ["boardDetails", boardId],
          });
          setIsSettingsModalOpen(false);
        },
        onError: () => {
          message.error("Failed to update board");
        },
      }
    );
  };

  return (
    <>
      <Drawer
        title="Menu"
        placement="right"
        closable={true}
        onClose={onClose}
        open={visible}
        width={300}
        className="board-menu-sidebar"
        closeIcon={<span className="text-xl">&times;</span>}
      >
        <div className="flex flex-col">
          <MenuItem
            icon={<InfoCircleOutlined size={16} />}
            text="About this board"
          />
          <div className="text-gray-500 text-xs px-12 -mt-2 mb-3">
            {currentBoard?.description || "No description available"}
          </div>

          {/* Activity section hidden for now */}
          {/* <MenuItem icon={<UnorderedListOutlined size={16} />} text="Activity" /> */}

          <MenuItem
            icon={<InboxOutlined size={16} />}
            text="Archived items"
            divider={true}
          />

          <MenuItem
            icon={<SettingOutlined size={16} />}
            text="Settings"
            onClick={handleSettingsClick}
          />

          {/* Change background section hidden for now */}
          {/* <MenuItem
            icon={<PictureOutlined size={16} />}
            text="Change background"
          /> */}

          <MenuItem icon={<FormOutlined size={16} />} text="Custom Fields" />

          <MenuItem
            icon={<Bot size={16} />}
            text="Automation"
            onClick={() => {
              router.push(
                `/workspace/${workspaceId}/board/${boardId}/automation`
              );
            }}
          />

          <MenuItem icon={<TagOutlined size={16} />} text="Labels" />

          {/* Stickers section hidden for now */}
          {/* <MenuItem icon={<SmileOutlined size={16} />} text="Stickers" /> */}

          {/* Make template section hidden for now */}
          {/* <MenuItem icon={<Trello size={16} />} text="Make template" /> */}
        </div>
      </Drawer>

      {/* Board Settings Modal */}
      {isSettingsModalOpen && (
        <BoardSettingsModal
          board={currentBoard || undefined}
          boardId={typeof boardId === "string" ? boardId : boardId?.[0] || ""}
          workspaceId={resolvedWorkspaceId}
          open={isSettingsModalOpen}
          onClose={handleSettingsClose}
          onSuccess={handleBoardUpdate}
        />
      )}
    </>
  );
};

export default BoardScopeMenu;

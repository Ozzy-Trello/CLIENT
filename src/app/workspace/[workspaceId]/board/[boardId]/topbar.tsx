import { Button, Tooltip, Typography, Tabs } from "antd";
import "./style.css";
import { Dispatch, SetStateAction } from "react";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { Ellipsis, Star } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@store/workspace_slice";
import { useParams } from "next/navigation";
import { useUserBoardOrder } from "@hooks/user-board-order";

interface BoardTopbarProps {
  setBoardScopeMenuOpen: Dispatch<SetStateAction<boolean>>;
  board?: any; // Board data from API response
  onTrackClick?: () => void;
  viewMode?: "kanban" | "list";
  onChangeViewMode?: (mode: "kanban" | "list") => void;
}

const BoardTopbar: React.FC<BoardTopbarProps> = ({
  setBoardScopeMenuOpen,
  board,
  onTrackClick,
  viewMode = "kanban",
  onChangeViewMode,
}) => {
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const reduxBoard = useSelector(selectCurrentBoard);
  const currentBoard = board || reduxBoard;
  const params = useParams();
  const resolvedWorkspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string);
  const { userBoardOrder, toggleFavorite, isTogglingFavorite } =
    useUserBoardOrder(resolvedWorkspaceId || "");
  const isFavorited =
    userBoardOrder?.some(
      (order) => order.boardId === currentBoard?.id && order.isFavorite
    ) || false;

  const handleStarClick = () => {
    if (!currentBoard?.id || isTogglingFavorite) {
      return;
    }
    toggleFavorite(currentBoard.id);
  };

  return (
    <div
      className="flex items-center justify-between h-[45px] absolute top-[45px] border-b border-gray-200 px-4"
      style={{
        width: collapsed
          ? `calc(100% - ${siderSmall}px)`
          : `calc(100% - ${siderWide}px)`,
        backgroundColor: currentBoard?.background || "#fff",
      }}
    >
      <div className="flex items-center gap-2 ml-5">
        <Typography.Title level={4} className="m-0">
          {currentBoard?.name}
        </Typography.Title>
        <Tooltip
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            size={16}
            className={`transition-colors cursor-pointer ${
              isFavorited
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-400 hover:text-yellow-400"
            }`}
            onClick={handleStarClick}
            style={{
              opacity: isTogglingFavorite ? 0.6 : 1,
              pointerEvents: isTogglingFavorite ? "none" : "auto",
            }}
          />
        </Tooltip>
        {/* View mode tabs placed next to board name and favorite */}
        <Tabs
          className="board-view-tabs"
          size="small"
          tabBarGutter={12}
          tabBarStyle={{ marginBottom: 0 }}
          activeKey={viewMode}
          onChange={(key) =>
            onChangeViewMode && onChangeViewMode(key as "kanban" | "list")
          }
          items={[
            { key: "kanban", label: "Kanban" },
            { key: "list", label: "List" },
          ]}
        />
      </div>

      <div className="flex items-center gap-2">
        {onTrackClick && (
          <Tooltip title="Create dashcard">
            <Button size="small" type="primary" onClick={onTrackClick}>
              Track
            </Button>
          </Tooltip>
        )}
        <Tooltip title="More options">
          <Button
            type="text"
            size="small"
            icon={<Ellipsis size={16} />}
            onClick={() => setBoardScopeMenuOpen(true)}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default BoardTopbar;

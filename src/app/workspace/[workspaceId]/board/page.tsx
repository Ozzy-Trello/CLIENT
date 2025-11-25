"use client";
import { Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Col,
  Dropdown,
  Menu,
  message,
  Row,
  Skeleton,
  Space,
  Typography,
} from "antd";
import { Earth, Lock, MoreHorizontal, Settings, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import BoardSettingsModal from "../../../../components/board-settings-modal";
import { usePermissions } from "../../../../hooks/account";
import { useBoards } from "../../../../hooks/board";
import { useUpdateBoard } from "../../../../hooks/use-update-board";
import { useUserBoardOrder } from "../../../../hooks/user-board-order";
import { Board } from "../../../../types/board";
import "./style.css";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const { Item: MenuItem } = Menu;
const { Title, Text } = Typography;

const BoardFilters = dynamic(() => import("./_filter_form"), {
  ssr: false,
  loading: () => <div>Loading filters...</div>,
});

const BoardsPage: React.FC = () => {
  const { workspaceId } = useParams();
  const router = useRouter();
  const workspaceIdStr = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId || "";
  const { boards, isLoading } = useBoards(workspaceIdStr);
  const { mutate: updateBoard } = useUpdateBoard();
  const queryClient = useQueryClient();
  const { canUpdate } = usePermissions();
  const { getSortedBoards, handleBoardReorder, isSettingOrder } =
    useUserBoardOrder(workspaceIdStr);
  const [filter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: "",
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  // Get boards sorted by user's custom order
  const sortedBoards = getSortedBoards(boards || []);

  const handleBoardClick = (boardId: string) => {
    router.push(`/workspace/${workspaceId}/board/${boardId}`);
  };

  const handleSettingsClick = (board: Board) => {
    setSelectedBoard(board);
    setIsSettingsModalOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsModalOpen(false);
    setSelectedBoard(null);
  };

  const handleBoardUpdate = (updatedData: Partial<Board>) => {
    if (!selectedBoard) return;

    updateBoard(
      { ...updatedData, id: selectedBoard.id },
      {
        onSuccess: () => {
          message.success("Board updated successfully");
          queryClient.invalidateQueries({
            queryKey: ["boards", workspaceIdStr],
          });
          setIsSettingsModalOpen(false);
        },
        onError: () => {
          message.error("Failed to update board");
        },
      }
    );
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    // If dropped outside the list or in the same position, do nothing
    if (!destination || destination.index === source.index) {
      return;
    }

    // Handle board reordering
    handleBoardReorder(sortedBoards, source.index, destination.index);
  };

  return (
    <div className="page scrollable-page">
      <div className="section-workspace"></div>
      <Typography.Title level={3} className="m-0">
        Boards
      </Typography.Title>

      <BoardFilters />

      <div className="section-card">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="boards-grid" direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  opacity: isSettingOrder ? 0.7 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <Row gutter={[10, 10]}>
                  {!isLoading &&
                    sortedBoards?.map((board, index) => (
                      <Draggable
                        key={`board-${board.id}`}
                        draggableId={`board-${board.id}`}
                        index={index}
                        isDragDisabled={!canUpdate("board")}
                      >
                        {(provided, snapshot) => (
                          <Col
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            xs={{ flex: "100%" }}
                            sm={{ flex: "50%" }}
                            md={{ flex: "40%" }}
                            lg={{ flex: "30%" }}
                            xl={{ flex: "20%" }}
                            style={{
                              ...provided.draggableProps.style,
                              transform: snapshot.isDragging
                                ? provided.draggableProps.style?.transform
                                : "none",
                            }}
                          >
                            <Card
                              className="board-item hover:shadow-sm"
                              style={{
                                backgroundImage: `url('${board?.background}')`,
                                backgroundPosition: "center",
                                backgroundSize: "cover",
                                backgroundRepeat: "no-repeat",
                                backgroundColor: board?.background || "#fff",
                                height: "120px",
                                margin: "5px",
                                cursor: snapshot.isDragging
                                  ? "grabbing"
                                  : "pointer",
                                position: "relative",
                                overflow: "hidden",
                                transform: snapshot.isDragging
                                  ? "rotate(5deg)"
                                  : "none",
                                boxShadow: snapshot.isDragging
                                  ? "0 8px 16px rgba(0,0,0,0.15)"
                                  : undefined,
                                transition: snapshot.isDragging
                                  ? "none"
                                  : "all 0.2s ease",
                              }}
                              onClick={() =>
                                !snapshot.isDragging &&
                                handleBoardClick(board.id)
                              }
                              styles={{
                                body: {
                                  padding: 0,
                                  height: "100%",
                                },
                              }}
                            >
                              <div
                                className="fx-v-sb-left"
                                style={{
                                  height: "100%",
                                  width: "100%",
                                  padding: "7px",
                                  position: "relative",
                                }}
                              >
                                {/* Drag handle - invisible but covers the card */}
                                <div
                                  {...provided.dragHandleProps}
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 0,
                                    cursor: canUpdate("board")
                                      ? "grab"
                                      : "pointer",
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "5px",
                                    right: "5px",
                                    zIndex: 2,
                                  }}
                                >
                                  {canUpdate("board") && (
                                    <Dropdown
                                      overlay={
                                        <Menu>
                                          <Menu.Item
                                            key="settings"
                                            onClick={(e) => {
                                              e.domEvent.stopPropagation();
                                              handleSettingsClick(board);
                                            }}
                                          >
                                            <Space>
                                              <Settings size={14} />
                                              Settings
                                            </Space>
                                          </Menu.Item>
                                        </Menu>
                                      }
                                      trigger={["click"]}
                                      placement="bottomRight"
                                    >
                                      <div
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        style={{
                                          display: "inline-block",
                                          padding: "4px",
                                          borderRadius: "3px",
                                          cursor: "pointer",
                                          backgroundColor: "transparent",
                                          transition: "background-color 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "rgba(0, 0, 0, 0.04)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor =
                                            "transparent";
                                        }}
                                      >
                                        <MoreHorizontal
                                          size={18}
                                          className="board-menu-icon"
                                          style={{
                                            color: "rgba(0, 0, 0, 0.45)",
                                          }}
                                        />
                                      </div>
                                    </Dropdown>
                                  )}
                                </div>
                                <Typography.Title
                                  level={4}
                                  className="title m-0"
                                  style={{ zIndex: 1, position: "relative" }}
                                >
                                  {board.name}
                                </Typography.Title>
                                <div
                                  style={{ zIndex: 1, position: "relative" }}
                                >
                                  {board.visibility === "shared" && (
                                    <Users size={15} />
                                  )}
                                  {board.visibility === "private" && (
                                    <Lock size={15} />
                                  )}
                                  {board.visibility === "public" && (
                                    <Earth size={15} />
                                  )}
                                </div>
                              </div>
                            </Card>
                          </Col>
                        )}
                      </Draggable>
                    ))}

                  {isLoading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <Col
                        key={`skeleton-${index}`}
                        xs={{ flex: "100%" }}
                        sm={{ flex: "50%" }}
                        md={{ flex: "40%" }}
                        lg={{ flex: "30%" }}
                        xl={{ flex: "20%" }}
                      >
                        <Skeleton.Input
                          active
                          style={{ width: "100%", height: "120px" }}
                        />
                      </Col>
                    ))}
                  {provided.placeholder}
                </Row>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <BoardSettingsModal
        open={isSettingsModalOpen}
        onClose={handleSettingsClose}
        board={selectedBoard || undefined}
        onSuccess={handleBoardUpdate}
      />
    </div>
  );
};

export default BoardsPage;

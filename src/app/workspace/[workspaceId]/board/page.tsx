"use client";
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
import { useBoards } from "../../../../hooks/board";
import { useUpdateBoard } from "../../../../hooks/use-update-board";
import { usePermissions } from "../../../../hooks/account";
import { Board } from "../../../../types/board";
import "./style.css";

const { Item: MenuItem } = Menu;
const { Title, Text } = Typography;

const BoardFilters = dynamic(() => import("./_filter_form"), {
  ssr: false,
  loading: () => <div>Loading filters...</div>,
});

const BoardsPage: React.FC = () => {
  const { workspaceId } = useParams();
  const router = useRouter();
  const { boards, isLoading } = useBoards(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );
  const { mutate: updateBoard } = useUpdateBoard();
  const queryClient = useQueryClient();
  const { canUpdate } = usePermissions();
  const [filter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: "",
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

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
          queryClient.invalidateQueries({ queryKey: ["boards", workspaceId] });
          setIsSettingsModalOpen(false);
        },
        onError: () => {
          message.error("Failed to update board");
        },
      }
    );
  };

  return (
    <div className="page scrollable-page">
      <div className="section-workspace"></div>
      <Typography.Title level={3} className="m-0">
        Boards
      </Typography.Title>

      <BoardFilters />

      <div className="section-card">
        <Row gutter={[10, 10]}>
          {!isLoading &&
            boards?.map((board, index) => (
              <Col
                key={`board-${board.id}-${index}`}
                xs={{ flex: "100%" }}
                sm={{ flex: "50%" }}
                md={{ flex: "40%" }}
                lg={{ flex: "30%" }}
                xl={{ flex: "20%" }}
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
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => handleBoardClick(board.id)}
                  bodyStyle={{
                    padding: 0,
                    height: "100%",
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
                    <div
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        zIndex: 1,
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
                    <Typography.Title level={4} className="title m-0">
                      {board.name}
                    </Typography.Title>
                    <div>
                      {board.visibility === "shared" && <Users size={15} />}
                      {board.visibility === "private" && <Lock size={15} />}
                      {board.visibility === "public" && <Earth size={15} />}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          {isLoading &&
            [1, 2, 3, 4, 5].map((item) => (
              <Col key={item}>
                <Space style={{ margin: "5px" }}>
                  <Skeleton.Input active={isLoading} size={"large"} />
                </Space>
              </Col>
            ))}
        </Row>
      </div>

      {selectedBoard && (
        <BoardSettingsModal
          boardId={selectedBoard.id}
          workspaceId={
            Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
          }
          open={isSettingsModalOpen}
          onClose={handleSettingsClose}
          onSuccess={handleBoardUpdate}
        />
      )}
    </div>
  );
};

export default BoardsPage;

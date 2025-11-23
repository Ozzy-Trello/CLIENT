"use client";
import { Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Col,
  Dropdown,
  Menu,
  message,
  Progress,
  Row,
  Skeleton,
  Space,
  Typography,
} from "antd";
import {
  Earth,
  Lock,
  MoreHorizontal,
  Settings,
  UploadCloud,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@api/index";
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

type ImportJobStatus = "pending" | "processing" | "completed" | "failed";

interface ImportJobSummary {
  id: string;
  filename: string;
  status: ImportJobStatus;
  progress?: {
    totalRecords: number;
    processedRecords: number;
  };
  boardName?: string;
  message?: string;
  error?: string;
  result?: {
    boardId: string;
    boardName: string;
    listCount: number;
    cardCount: number;
  };
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

const BoardsPage: React.FC = () => {
  const { workspaceId } = useParams();
  const router = useRouter();
  const workspaceIdStr = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId || "";
  const { boards, isLoading } = useBoards(workspaceIdStr);
  const { mutate: updateBoard } = useUpdateBoard();
  const queryClient = useQueryClient();
  const { canUpdate, canCreate } = usePermissions();
  const { getSortedBoards, handleBoardReorder, isSettingOrder } =
    useUserBoardOrder(workspaceIdStr);
  const [filter] = useState({
    sortBy: "",
    filterBy: "",
    searchKeyword: "",
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importJobs, setImportJobs] = useState<Record<string, ImportJobSummary>>({});
  const [trackedJobIds, setTrackedJobIds] = useState<string[]>([]);
  const trackedJobIdsRef = useRef<string[]>([]);
  const completedJobsRef = useRef(new Set<string>());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importJobList = useMemo(() => {
    return Object.values(importJobs).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [importJobs]);
  const statusColors: Record<ImportJobStatus, string> = {
    pending: "#d97706",
    processing: "#2563eb",
    completed: "#16a34a",
    failed: "#dc2626",
  };

  const getJobStatusLabel = (status: ImportJobStatus) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "processing":
        return "Processing";
      default:
        return "Pending";
    }
  };

  const getJobProgressPercent = (job: ImportJobSummary) => {
    if (job.progress?.totalRecords) {
      if (job.progress.totalRecords === 0) {
        return 0;
      }
      return Math.min(
        100,
        Math.round(
          (job.progress.processedRecords / job.progress.totalRecords) * 100
        )
      );
    }
    return job.status === "completed" ? 100 : 0;
  };

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

  const handleJobsResponse = useCallback(
    (
      jobs: ImportJobSummary[],
      options?: { suppressNotifications?: boolean }
    ) => {
      if (!jobs || !jobs.length) return;
      const suppressNotifications = options?.suppressNotifications;

      setImportJobs((prev) => {
        const next = { ...prev };
        jobs.forEach((job) => {
          next[job.id] = {
            ...next[job.id],
            ...job,
          };
        });
        return next;
      });

      const finishedIds: string[] = [];
      jobs.forEach((job) => {
        if (
          (job.status === "completed" || job.status === "failed") &&
          !completedJobsRef.current.has(job.id)
        ) {
          completedJobsRef.current.add(job.id);
          if (!suppressNotifications) {
            if (job.status === "completed") {
              message.success(
                `Imported ${job.boardName || job.filename || "ClickUp board"}.`
              );
              if (job.result?.boardId) {
                queryClient.invalidateQueries({
                  queryKey: ["boards", workspaceIdStr],
                });
              }
            } else if (job.status === "failed") {
              message.error(job.error || `Failed to import ${job.filename}`);
            }
          }
        }

        if (job.status === "completed" || job.status === "failed") {
          finishedIds.push(job.id);
        }
      });

      if (finishedIds.length) {
        setTrackedJobIds((prev) =>
          prev.filter((jobId) => !finishedIds.includes(jobId))
        );
      }
    },
    [queryClient, workspaceIdStr]
  );

  useEffect(() => {
    trackedJobIdsRef.current = trackedJobIds;
  }, [trackedJobIds]);

  useEffect(() => {
    const fetchExistingJobs = async () => {
      try {
        const response = await api.get("/import/clickup/jobs");
        const jobs: ImportJobSummary[] = response?.data?.data?.jobs || [];
        handleJobsResponse(jobs, { suppressNotifications: true });
        const activeJobIds = jobs
          .filter((job) => job.status === "pending" || job.status === "processing")
          .map((job) => job.id);
        if (activeJobIds.length) {
          setTrackedJobIds((prev) =>
            Array.from(new Set([...prev, ...activeJobIds]))
          );
        }
      } catch (error) {
        console.error("Failed to fetch existing import jobs", error);
      }
    };

    fetchExistingJobs();
  }, [handleJobsResponse]);

  const fetchImportJobStatuses = useCallback(
    async (jobIds: string[]) => {
      if (!jobIds.length) return;
      try {
        const response = await api.get("/import/clickup/jobs", {
          params: {
            jobIds: jobIds.join(","),
          },
        });
        const jobs: ImportJobSummary[] = response?.data?.data?.jobs || [];
        handleJobsResponse(jobs);
      } catch (error) {
        console.error("Failed to fetch import job statuses", error);
      }
    },
    [handleJobsResponse]
  );

  useEffect(() => {
    if (!trackedJobIds.length) {
      return;
    }

    fetchImportJobStatuses(trackedJobIds);
    const intervalId = setInterval(() => {
      const jobIds = trackedJobIdsRef.current;
      if (!jobIds.length) return;
      fetchImportJobStatuses(jobIds);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [trackedJobIds.length, fetchImportJobStatuses]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    // If dropped outside the list or in the same position, do nothing
    if (!destination || destination.index === source.index) {
      return;
    }

    // Handle board reordering
    handleBoardReorder(sortedBoards, source.index, destination.index);
  };

  const handleImportClick = () => {
    if (!workspaceIdStr) {
      message.warning("Select a workspace before importing.");
      return;
    }

    if (!canCreate("board")) {
      message.warning("You don't have permission to import boards.");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputElement = event.target;
    const files = inputElement.files ? Array.from(inputElement.files) : [];
    if (!files.length) {
      return;
    }

    const resetInput = () => {
      inputElement.value = "";
    };

    const invalidFile = files.find(
      (f) => !f.name.toLowerCase().endsWith(".csv")
    );
    if (invalidFile) {
      message.error(
        `File "${invalidFile.name}" is not a valid ClickUp CSV export.`
      );
      resetInput();
      return;
    }

    if (!workspaceIdStr) {
      message.error("Workspace is missing, cannot import.");
      resetInput();
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await api.post("/import/clickup", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "workspace-id": workspaceIdStr,
        },
      });

      const jobs: ImportJobSummary[] = response?.data?.data?.jobs || [];
      if (!jobs.length) {
        message.warning("No import jobs were queued.");
      } else {
        handleJobsResponse(jobs);
        setTrackedJobIds((prev) =>
          Array.from(new Set([...prev, ...jobs.map((job) => job.id)]))
        );
        message.success(
          `Queued ${jobs.length} ClickUp import ${
            jobs.length === 1 ? "job" : "jobs"
          }.`
        );
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to queue ClickUp import.";
      message.error(errorMessage);
    } finally {
      setIsImporting(false);
      resetInput();
    }
  };

  return (
    <div className="page scrollable-page">
      <div className="section-workspace"></div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={3} className="m-0">
          Boards
        </Typography.Title>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button
          type="primary"
          icon={<UploadCloud size={16} />}
          onClick={handleImportClick}
            loading={isImporting}
            disabled={!canCreate("board")}
          >
            Import from ClickUp
          </Button>
          <input
            type="file"
            accept=".csv,text/csv"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {importJobList.length > 0 && (
        <Card size="small" style={{ marginTop: "1rem" }}>
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            <Typography.Text strong>
              ClickUp import queue ({importJobList.length})
            </Typography.Text>
            {importJobList.map((job) => {
              const percent = getJobProgressPercent(job);
              const isFailure = job.status === "failed";
              const isSuccess = job.status === "completed";
              return (
                <Card
                  key={job.id}
                  size="small"
                  style={{ background: "#fafafa" }}
                  bodyStyle={{ padding: "12px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <Typography.Text strong>{job.filename}</Typography.Text>
                      {job.boardName && (
                        <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                          {job.boardName}
                        </Typography.Text>
                      )}
                    </div>
                    <Typography.Text style={{ color: statusColors[job.status] }}>
                      {getJobStatusLabel(job.status)}
                    </Typography.Text>
                  </div>
                  <Progress
                    percent={percent}
                    size="small"
                    status={
                      isFailure ? "exception" : isSuccess ? "success" : "active"
                    }
                  />
                  {isSuccess && job.message && (
                    <Typography.Text type="secondary">
                      {job.message}
                    </Typography.Text>
                  )}
                  {isFailure && job.error && (
                    <Typography.Text type="danger">{job.error}</Typography.Text>
                  )}
                  {isSuccess && job.result?.boardId && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() =>
                        router.push(
                          `/workspace/${workspaceIdStr}/board/${job.result?.boardId}`
                        )
                      }
                      style={{ paddingLeft: 0 }}
                    >
                      View board
                    </Button>
                  )}
                </Card>
              );
            })}
          </Space>
        </Card>
      )}

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

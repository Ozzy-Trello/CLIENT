"use client";

import "./style.css";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import {
  Avatar,
  Button,
  Menu,
  Typography,
  Layout,
  Skeleton,
  Space,
} from "antd";
import TouchAwareTooltip from "@components/touch-aware-tooltip";
import Link from "next/link";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trello,
  Users,
  Shield,
  Settings,
  Star,
  Package,
  Layers,
  Database,
  Menu as MenuIcon,
} from "lucide-react";
import { Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import dynamic from "next/dynamic";

// Dynamically import DragDropContext to avoid SSR issues
const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);
import ModalCreateBoard from "../modal-create-board";
import { useDispatch } from "react-redux";
import { MenuProps } from "antd";
import { useSelector } from "react-redux";
import {
  selectCurrentBoard,
  selectCurrentWorkspace,
  setCurrentBoard,
} from "@store/workspace_slice";
import { selectTheme, selectIsDarkMode, selectUser } from "@store/app_slice";
import { useBoards } from "@hooks/board";
import { useParams, useRouter } from "next/navigation";
import { Board } from "@myTypes/board";
import { usePermissions, useCurrentAccount } from "@hooks/account";
import { useUserBoardOrder } from "@hooks/user-board-order";

// Role categorization utility
const getRoleCategory = (
  roleName: string
): "super_admin" | "supervisor" | "warehouse" | "production" => {
  if (roleName === "Super Admin") {
    return "super_admin";
  }

  if (roleName.includes("SPV") || roleName.includes("Supervisor")) {
    return "supervisor";
  }

  if (roleName.includes("Warehouse")) {
    return "warehouse";
  }

  // Everyone else is production
  return "production";
};

const { Sider } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

const Sidebar = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  // const path = usePat
  const { collapsed, toggleSidebar, siderWide, siderSmall, isCompact } =
    useWorkspaceSidebar();

  // Helper function to get board icon background style
  const getBoardIconStyle = (board: Board) => {
    const defaultStyle = {
      backgroundColor: "#e5e7eb",
      backgroundImage: "none",
    };

    if (!board.background) {
      return defaultStyle;
    }

    // Check if background is an image URL
    if (board.background.startsWith("http") || board.background.includes(".")) {
      return {
        backgroundColor: "transparent",
        backgroundImage: `url(${board.background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }

    // Otherwise, it's a color
    return {
      backgroundColor: board.background,
      backgroundImage: "none",
    };
  };
  const { workspaceId, boardId } = useParams();
  const [allMenus, setAllMenus] = useState<MenuItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredBoardId, setHoveredBoardId] = useState<number | null>(null);

  const [openCreateBoardModal, setOpenCreateBoardModal] =
    useState<boolean>(false);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;
  const { boards } = useBoards(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );
  const { canCreate } = usePermissions();

  // Get workspace ID as string for user board order
  const workspaceIdStr = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId;

  // Use user board order hook for drag-and-drop functionality
  const {
    getSortedBoards,
    handleBoardReorder,
    isSettingOrder,
    toggleFavorite,
    userBoardOrder,
    isTogglingFavorite,
  } = useUserBoardOrder(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );

  // Get sorted boards based on user preferences
  const sortedBoards = getSortedBoards(boards || []);

  const favorites = sortedBoards.filter((board) => board.isFavorite);
  const regulars = sortedBoards.filter((board) => !board.isFavorite);

  // Get current user and check if they are Super Admin
  const { data: currentAccountData, isLoading: isLoadingAccount } =
    useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const userRole = currentUser?.role?.name || "";
  const isSuperAdmin = userRole === "Super Admin";
  const roleCategory = getRoleCategory(userRole);

  // Use refs to avoid dependency changes in useEffect
  const prevWorkspaceIdRef = useRef<string | null>(null);
  const prevBoardsLengthRef = useRef<number>(0);
  const prevCollapsedRef = useRef<boolean>(collapsed); // Add missing ref for collapsed state

  // Memoize handlers to prevent them from changing on every render
  const handleOpenBoardModal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Ensure event doesn't propagate
    setOpenCreateBoardModal(true);
  }, []);

  const handleSelectBoardItem = (board: Board) => {
    if (board?.id !== currentBoard?.id) {
      dispatch(setCurrentBoard(board));
    }
    const resolvedWorkspaceId = Array.isArray(workspaceId)
      ? workspaceId[0]
      : workspaceId;
    router.push(`/workspace/${resolvedWorkspaceId}/board/${board?.id}`);
    if (isCompact && !collapsed) {
      toggleSidebar();
    }
  };

  const handleToggleFavorite = (board: Board) => {
    console.log(board, "ini board di toggle fav");
    toggleFavorite(board.id.toString());
  };

  const toggleTooltip = collapsed
    ? isCompact
      ? "Open workspace menu"
      : "Expand sidebar"
    : isCompact
    ? "Close workspace menu"
    : "Collapse sidebar";

  // Memoize the base menus
  const baseMenus = useMemo<MenuItem[]>(() => {
    if (!workspaceId) return [];

    const resolvedWorkspaceId = Array.isArray(workspaceId)
      ? workspaceId[0]
      : workspaceId;

    const menus: MenuItem[] = [
      {
        key: `/workspace/${resolvedWorkspaceId}/board`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/board`}
          >
            Boards
          </Link>
        ),
        icon: <Trello size={16} />,
      },
    ];

    // Show Members and Roles menu to Super Admin
    // Show if we know they're super admin (either from loaded data or if we have user data)
    if (isSuperAdmin) {
      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/members`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/members`}
          >
            Members
          </Link>
        ),
        icon: <Users size={16} />,
      });

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/roles`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/roles`}
          >
            Roles
          </Link>
        ),
        icon: <Shield size={16} />,
      });

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/custom-fields`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/custom-fields`}
          >
            Custom Fields
          </Link>
        ),
        icon: <Settings size={16} />,
      });
    }

    return menus;
  }, [workspaceId, isSuperAdmin, isLoadingAccount]);

  // Check if user can create boards
  const canCreateBoard = canCreate("board");

  // Build menu items separately to avoid frequent render cycles
  useEffect(() => {
    // Skip if user data is still loading
    if (isLoadingAccount) {
      return;
    }

    // Skip if nothing significant has changed
    const currentWorkspaceId = Array.isArray(workspaceId)
      ? workspaceId[0]
      : workspaceId || null;
    const currentBoardsLength = sortedBoards?.length || 0;

    if (
      currentWorkspaceId === prevWorkspaceIdRef.current &&
      currentBoardsLength === prevBoardsLengthRef.current &&
      collapsed === prevCollapsedRef.current &&
      allMenus.length > 0 &&
      !isLoadingAccount // Ensure we rebuild when loading completes
    ) {
      return;
    }

    // Update refs for next comparison
    prevWorkspaceIdRef.current = currentWorkspaceId;
    prevBoardsLengthRef.current = currentBoardsLength;
    prevCollapsedRef.current = collapsed;

    // Build menus only when needed
    const buildMenus = async () => {
      setIsFetching(true);

      try {
        // If no workspace, just use base menus
        if (!workspaceId) {
          setAllMenus(baseMenus);
          return;
        }

        // Start with base menus
        const fullMenus: MenuItem[] = [...baseMenus];

        // Add header for boards section
        if (baseMenus.length > 0) {
          fullMenus.push({
            key: "menu-your-boards",
            disabled: true,
            label: (
              <div
                className={
                  collapsed ? "hidden" : "flex items-center justify-between"
                }
              >
                <Typography.Text strong>Your boards</Typography.Text>
                <TouchAwareTooltip
                  title={
                    !canCreateBoard
                      ? "Insufficient permissions to create boards"
                      : "Create new board"
                  }
                >
                  <Button
                    size="small"
                    onClick={canCreateBoard ? handleOpenBoardModal : undefined}
                    disabled={!canCreateBoard}
                  >
                    +
                  </Button>
                </TouchAwareTooltip>
              </div>
            ),
            icon: <span></span>,
          });
        }

        // Note: Board items will be rendered separately with drag-and-drop functionality
        // Static menu items only include base navigation

        // Only update state if values have actually changed
        setAllMenus((prevMenus) => {
          // Simple length check to avoid deep comparison
          if (prevMenus.length !== fullMenus.length) {
            return fullMenus;
          }
          // If lengths match, check if any keys have changed
          const prevKeys = prevMenus.map((item) => item?.key);
          const newKeys = fullMenus.map((item) => item?.key);
          if (JSON.stringify(prevKeys) !== JSON.stringify(newKeys)) {
            return fullMenus;
          }
          return prevMenus;
        });
      } finally {
        setIsFetching(false);
      }
    };

    // Execute the menu building
    buildMenus();
  }, [
    baseMenus,
    collapsed,
    workspaceId,
    sortedBoards,
    canCreateBoard,
    handleOpenBoardModal,
    isLoadingAccount,
    isSuperAdmin,
    userRole,
  ]);

  const selectedKeys = useMemo(() => {
    if (boardId) {
      return [`/workspace/${workspaceId}/board/${boardId}`];
    } else {
      return [`/workspace/${workspaceId}/board`];
    }
  }, [boardId, workspaceId]);

  // Handle drag start for visual feedback
  const onDragStart = useCallback(() => {
    // Set global drag flag to prevent WebSocket updates during drag
    (window as any).__DRAG_IN_PROGRESS__ = true;
  }, []);

  // Handle drag end for favorites reordering
  const onDragEndFavorites = useCallback(
    (result: DropResult) => {
      // Clear global drag flag to allow WebSocket updates
      (window as any).__DRAG_IN_PROGRESS__ = false;

      if (!result.destination) {
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        return;
      }

      // Handle reordering within favorites
      handleBoardReorder(favorites, sourceIndex, destinationIndex, true);
    },
    [handleBoardReorder, favorites]
  );

  // Handle drag end for regular boards reordering
  const onDragEndRegular = useCallback(
    (result: DropResult) => {
      // Clear global drag flag to allow WebSocket updates
      (window as any).__DRAG_IN_PROGRESS__ = false;

      if (!result.destination) {
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        return;
      }

      // Handle reordering within regular boards
      handleBoardReorder(regulars, sourceIndex, destinationIndex, false);
    },
    [handleBoardReorder, regulars]
  );

  // Render the sidebar
  return (
    <>
      <div
        className="relative h-full"
        onMouseEnter={!isCompact ? () => setIsHovered(true) : undefined}
        onMouseLeave={!isCompact ? () => setIsHovered(false) : undefined}
        style={
          isCompact ? undefined : { width: collapsed ? siderSmall : siderWide }
        }
      >
        {isCompact && !collapsed && (
          <div
            className="workspace-sidebar-mask"
            onClick={toggleSidebar}
            style={{
              position: "fixed",
              top: 45,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              zIndex: 300,
            }}
          />
        )}
        <Sider
          className={`transition-all duration-200 ease-in-out ${
            !isCompact && collapsed ? "w-3 scrollbar-none" : ""
          }`}
          collapsed={isCompact ? false : collapsed}
          style={{
            height: isCompact ? "calc(100vh - 45px)" : "100%",
            position: "fixed",
            left: 0,
            top: 45,
            overflow: "hidden",
            overflowY: "auto",
            backgroundColor: `rgba(${colors.surface}, ${
              isCompact ? "0.98" : "0.85"
            })`,
            backdropFilter: isCompact ? "blur(12px)" : "blur(5px)",
            borderRight: isCompact ? "none" : `1px solid rgb(${colors.border})`,
            zIndex: isCompact ? 301 : 101,
            maxWidth: isCompact ? "90vw" : undefined,
            transform: isCompact
              ? collapsed
                ? "translateX(-100%)"
                : "translateX(0)"
              : undefined,
            boxShadow: isCompact ? "0 10px 35px rgba(0, 0, 0, 0.25)" : "none",
            transition: isCompact ? "transform 0.3s ease" : undefined,
          }}
          width={
            isCompact
              ? Math.min(siderWide, 320)
              : collapsed
              ? siderSmall
              : siderWide
          }
          collapsedWidth={isCompact ? 0 : 12}
          trigger={null}
        >
          {userRole && !collapsed && (
            <div
              className="absolute top-0 left-2 right-8 z-10 flex items-center justify-center"
              style={{ height: "60px" }}
            >
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `rgba(${colors.primary}, 0.1)`,
                  color: `rgb(${colors.primary})`,
                  border: `1px solid rgba(${colors.primary}, 0.2)`,
                }}
              >
                {userRole}
              </span>
            </div>
          )}

          <div
            className="transition-opacity duration-200 ease-in-out overflow-y-auto"
            style={{
              opacity: collapsed ? 0 : 1,
              marginTop: userRole ? "40px" : "0", // Add margin when role is displayed
              height: `calc(100vh - ${userRole ? "125px" : "85px"})`, // Ensure proper height for scrolling
              paddingBottom: "20px", // Add some bottom padding
            }}
          >
            {!collapsed && (
              <>
                <div
                  className="flex justify-between items-center p-2.5"
                  style={{ borderBottom: `1px solid rgb(${colors.border})` }}
                >
                  <div className="flex items-center">
                    <Typography className="font-semibold">
                      {currentWorkspace?.name}
                    </Typography>
                  </div>
                </div>

                {/* Static menu items (non-draggable) */}
                <Menu
                  mode="inline"
                  defaultSelectedKeys={["1"]}
                  style={{ borderRight: 0, fontSize: "12px" }}
                  items={allMenus}
                  className="[&_.ant-menu-item]:my-1 [&_.ant-menu-item-icon]:flex [&_.ant-menu-item-icon]:items-center text-[10px]"
                />

                {/* Favorites Section */}
                {favorites?.length > 0 && (
                  <DragDropContext
                    onDragStart={onDragStart}
                    onDragEnd={onDragEndFavorites}
                  >
                    <div
                      className="px-2 py-1 mt-4 mb-2"
                      style={{
                        borderBottom: `1px solid rgb(${colors.border})`,
                      }}
                    >
                      <Typography.Text
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: `rgb(${colors.textSecondary})` }}
                      >
                        Favorites
                      </Typography.Text>
                    </div>
                    <Droppable droppableId="sidebar-favorites">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`sidebar-boards-droppable ${
                            snapshot.isDraggingOver ? "drag-over" : ""
                          }`}
                          style={{ marginBottom: "8px" }}
                        >
                          {favorites.map((board, index) => (
                            <Draggable
                              key={board.id}
                              draggableId={`fav-${board.id}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`sidebar-board-item ${
                                    boardId === board.id.toString()
                                      ? "selected"
                                      : ""
                                  } ${snapshot.isDragging ? "dragging" : ""}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                  }}
                                  onClick={() =>
                                    router.push(
                                      `/workspace/${workspaceId}/board/${board.id}`
                                    )
                                  }
                                >
                                  {/* Drag handle indicator */}
                                  <div className="sidebar-drag-handle">
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="currentColor"
                                    >
                                      <circle cx="2" cy="2" r="1" />
                                      <circle cx="6" cy="2" r="1" />
                                      <circle cx="10" cy="2" r="1" />
                                      <circle cx="2" cy="6" r="1" />
                                      <circle cx="6" cy="6" r="1" />
                                      <circle cx="10" cy="6" r="1" />
                                      <circle cx="2" cy="10" r="1" />
                                      <circle cx="6" cy="10" r="1" />
                                      <circle cx="10" cy="10" r="1" />
                                    </svg>
                                  </div>

                                  <div
                                    className="board-icon"
                                    style={getBoardIconStyle(board)}
                                  >
                                    {board.name?.charAt(0).toUpperCase()}
                                  </div>

                                  <div className="board-title">
                                    {board.name}
                                  </div>

                                  <div className="board-actions">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(board);
                                      }}
                                      className="ml-2 shrink-0 rounded p-1 transition-colors hover:bg-gray-200"
                                      style={{
                                        opacity: isTogglingFavorite ? 0.6 : 1,
                                        pointerEvents: isTogglingFavorite
                                          ? "none"
                                          : "auto",
                                      }}
                                      aria-disabled={isTogglingFavorite}
                                    >
                                      <Star
                                        size={14}
                                        style={{
                                          color: "#eab308",
                                          fill: "#eab308",
                                        }}
                                      />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}

                {/* Regular Boards Section */}
                {regulars?.length > 0 && (
                  <DragDropContext
                    onDragStart={onDragStart}
                    onDragEnd={onDragEndRegular}
                  >
                    <div
                      className="px-2 py-1 mt-4 mb-2"
                      style={{
                        borderBottom: `1px solid rgb(${colors.border})`,
                      }}
                    >
                      <Typography.Text
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: `rgb(${colors.textSecondary})` }}
                      >
                        Boards
                      </Typography.Text>
                    </div>
                    <Droppable droppableId="sidebar-boards">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`sidebar-boards-droppable ${
                            snapshot.isDraggingOver ? "drag-over" : ""
                          }`}
                          style={{ marginBottom: "8px" }}
                        >
                          {regulars.map((board, index) => (
                            <Draggable
                              key={board.id}
                              draggableId={`board-${board.id}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`sidebar-board-item ${
                                    boardId === board.id.toString()
                                      ? "selected"
                                      : ""
                                  } ${snapshot.isDragging ? "dragging" : ""}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                  }}
                                  onClick={() =>
                                    router.push(
                                      `/workspace/${workspaceId}/board/${board.id}`
                                    )
                                  }
                                >
                                  <div className="sidebar-drag-handle">
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 12 12"
                                      fill="currentColor"
                                    >
                                      <circle cx="2" cy="2" r="1" />
                                      <circle cx="6" cy="2" r="1" />
                                      <circle cx="10" cy="2" r="1" />
                                      <circle cx="2" cy="6" r="1" />
                                      <circle cx="6" cy="6" r="1" />
                                      <circle cx="10" cy="6" r="1" />
                                      <circle cx="2" cy="10" r="1" />
                                      <circle cx="6" cy="10" r="1" />
                                      <circle cx="10" cy="10" r="1" />
                                    </svg>
                                  </div>

                                  <div
                                    className="board-icon"
                                    style={getBoardIconStyle(board)}
                                  >
                                    {board.name?.charAt(0).toUpperCase()}
                                  </div>

                                  <div className="board-title">
                                    {board.name}
                                  </div>

                                  <div className="board-actions">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(board);
                                      }}
                                      className="ml-2 shrink-0 rounded p-1 transition-colors hover:bg-gray-200"
                                      style={{
                                        opacity: isTogglingFavorite ? 0.6 : 1,
                                        pointerEvents: isTogglingFavorite
                                          ? "none"
                                          : "auto",
                                      }}
                                      aria-disabled={isTogglingFavorite}
                                    >
                                      <Star
                                        key={index}
                                        size={14}
                                        color={
                                          hoveredBoardId === index
                                            ? "#eab308"
                                            : "#d1d5db"
                                        }
                                        fill={
                                          hoveredBoardId === index
                                            ? "#eab308"
                                            : "none"
                                        }
                                        className="transition-colors"
                                        onMouseEnter={() =>
                                          setHoveredBoardId(index)
                                        }
                                        onMouseLeave={() =>
                                          setHoveredBoardId(null)
                                        }
                                      />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}

                {isFetching &&
                  [1, 2, 3].map((item) => (
                    <Space
                      key={`loader-space-${item}`}
                      className="mx-0 my-0 mb-2.5 ml-6"
                    >
                      <Skeleton.Avatar
                        active={isFetching}
                        size={"small"}
                        shape={"square"}
                      />
                      <Skeleton.Input active={isFetching} size={"small"} />
                    </Space>
                  ))}
              </>
            )}
          </div>
        </Sider>

        <TouchAwareTooltip title={toggleTooltip} placement="right">
          <Button
            className="flex items-center justify-center rounded-full w-6 h-6 p-0 transition-all duration-200 ease-in-out hover:shadow-lg"
            aria-label={toggleTooltip}
            size="small"
            type="text"
            icon={
              isCompact ? (
                collapsed ? (
                  <MenuIcon size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )
              ) : collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )
            }
            onClick={toggleSidebar}
            style={{
              position: isCompact ? "fixed" : "absolute",
              top: isCompact ? 55 : 58,
              left: isCompact
                ? 12
                : collapsed
                ? `calc(${siderSmall}px - 10px)`
                : `calc(${siderWide}px - 30px)`,
              zIndex: isCompact ? 302 : 102,
              backgroundColor: `rgb(${colors.surface})`,
              border: `1px solid rgb(${colors.border})`,
              color: `rgb(${colors.text})`,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              transform: !isCompact && isHovered ? "scale(1.05)" : "scale(1)",
            }}
          />
        </TouchAwareTooltip>
      </div>
      <ModalCreateBoard
        open={openCreateBoardModal}
        setOpen={setOpenCreateBoardModal}
      />
    </>
  );
};

// Use React.memo with custom comparison to prevent unnecessary rerenders
export default React.memo(Sidebar);

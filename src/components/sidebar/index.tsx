"use client";

import "./style.css";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import {
  Avatar,
  Button,
  Badge,
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
  Activity,
  MonitorSmartphone,
  ClipboardList,
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
import { useParams, usePathname, useRouter } from "next/navigation";
import { Board } from "@myTypes/board";
import { usePermissions, useCurrentAccount } from "@hooks/account";
import { useUserBoardOrder } from "@hooks/user-board-order";
import { useNotulensiList } from "@hooks/notulensi";

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
  const pathname = usePathname();
  // const path = usePat
  const { collapsed, toggleSidebar, siderWide, siderSmall } =
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
  const { data: assignedNotulensi } = useNotulensiList(workspaceIdStr || "", {
    scope: "assigned",
    status: ["new", "in_progress", "waiting_review", "revision"],
    page: 1,
    limit: 1,
  });
  const assignedNotulensiCount = assignedNotulensi?.pagination.total ?? 0;

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
  const prevAssignedNotulensiCountRef = useRef<number | null>(null);

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
  };

  const handleToggleFavorite = (board: Board) => {
    console.log(board, "ini board di toggle fav");
    toggleFavorite(board.id.toString());
  };

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
      {
        key: `/workspace/${resolvedWorkspaceId}/notulensi`,
        label: (
          <Link
            className="flex w-full items-center justify-between gap-2"
            href={`/workspace/${resolvedWorkspaceId}/notulensi`}
          >
            <span>Tasks and Projects</span>
            <Badge count={assignedNotulensiCount} />
          </Link>
        ),
        icon: <ClipboardList size={16} />,
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
        key: `/workspace/${resolvedWorkspaceId}/materials`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/materials`}
          >
            Materials
          </Link>
        ),
        icon: <Layers size={16} />,
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

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/master-data`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/master-data`}
          >
            Master Data
          </Link>
        ),
        icon: <Database size={16} />,
      });

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/master-planner`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/master-planner`}
          >
            Master Planner
          </Link>
        ),
        icon: <Layers size={16} />,
      });

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/split-jobs`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/split-jobs`}
          >
            Split Jobs
          </Link>
        ),
        icon: <Package size={16} />,
      });

      menus.push({
        key: `aksesoris-${resolvedWorkspaceId}`,
        label: "Aksesoris",
        icon: <Star size={16} />,
        children: [
          {
            key: `/workspace/${resolvedWorkspaceId}/aksesoris`,
            label: (
              <Link
                className="block w-full"
                href={`/workspace/${resolvedWorkspaceId}/aksesoris`}
              >
                Master Aksesoris
              </Link>
            ),
          },
        ],
      });

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/automation-dashboard`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/automation-dashboard`}
          >
            Automation Log
          </Link>
        ),
        icon: <Activity size={16} />,
      });

      menus.push({
        key: `/workspace/${resolvedWorkspaceId}/sessions`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${resolvedWorkspaceId}/sessions`}
          >
            Sessions
          </Link>
        ),
        icon: <MonitorSmartphone size={16} />,
      });
    }

    return menus;
  }, [workspaceId, isSuperAdmin, isLoadingAccount, assignedNotulensiCount]);

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
    const assignedNotulensiCountChanged =
      assignedNotulensiCount !== prevAssignedNotulensiCountRef.current;

    if (
      currentWorkspaceId === prevWorkspaceIdRef.current &&
      currentBoardsLength === prevBoardsLengthRef.current &&
      collapsed === prevCollapsedRef.current &&
      !assignedNotulensiCountChanged &&
      allMenus.length > 0 &&
      !isLoadingAccount // Ensure we rebuild when loading completes
    ) {
      return;
    }

    // Update refs for next comparison
    prevWorkspaceIdRef.current = currentWorkspaceId;
    prevBoardsLengthRef.current = currentBoardsLength;
    prevCollapsedRef.current = collapsed;
    prevAssignedNotulensiCountRef.current = assignedNotulensiCount;

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
          if (assignedNotulensiCountChanged) {
            return fullMenus;
          }
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
    assignedNotulensiCount,
  ]);

  const selectedKeys = useMemo(() => {
    const resolvedWorkspaceId = Array.isArray(workspaceId)
      ? workspaceId[0]
      : workspaceId || "";

    if (!resolvedWorkspaceId) {
      return [];
    }

    const baseWorkspacePath = `/workspace/${resolvedWorkspaceId}`;

    if (pathname?.startsWith(`${baseWorkspacePath}/notulensi`)) {
      return [`${baseWorkspacePath}/notulensi`];
    }

    if (pathname?.startsWith(`${baseWorkspacePath}/board/`) && boardId) {
      return [`${baseWorkspacePath}/board/${boardId}`];
    }

    const staticPaths = [
      "board",
      "members",
      "materials",
      "roles",
      "custom-fields",
      "master-data",
      "master-planner",
      "split-jobs",
      "aksesoris",
      "automation-dashboard",
      "sessions",
    ];

    const matched = staticPaths.find((segment) =>
      pathname?.startsWith(`${baseWorkspacePath}/${segment}`)
    );

    return [matched ? `${baseWorkspacePath}/${matched}` : `${baseWorkspacePath}/board`];
  }, [boardId, pathname, workspaceId]);

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
    <div
      className="relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: collapsed ? siderSmall : siderWide }}
    >
      <Sider
        className={`transition-all duration-200 ease-in-out ${
          collapsed ? "w-3 scrollbar-none" : ""
        }`}
        collapsed={collapsed}
        style={{
          height: "100%",
          position: "fixed",
          left: 0,
          top: 45,
          overflow: "hidden", // Prevent horizontal scrolling
          overflowY: "auto", // Allow vertical scrolling when needed
          backgroundColor: `rgba(${colors.surface}, 0.85)`, // Theme-aware semi-transparent background
          backdropFilter: "blur(5px)", // Add blur effect for better readability
          borderRight: `1px solid rgb(${colors.border})`, // Theme-aware border
          zIndex: 101,
        }}
        width={collapsed ? siderSmall : siderWide}
        collapsedWidth={12}
        trigger={null}
      >
        {/* Role Display - Centered both horizontally and vertically */}
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
              {roleCategory.replace("_", " ").toUpperCase()}
            </span>
          </div>
        )}

        {/* Collapsed role display */}
        {userRole && collapsed && (
          <div
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center"
            style={{ height: "48px" }}
          >
            <span
              className="text-xs rounded-full font-medium flex items-center justify-center"
              style={{
                backgroundColor: `rgba(${colors.primary}, 0.1)`,
                color: `rgb(${colors.primary})`,
                border: `1px solid rgba(${colors.primary}, 0.2)`,
                width: "20px",
                height: "20px",
                fontSize: "10px",
              }}
            >
              {roleCategory.charAt(0).toUpperCase()}
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
                selectedKeys={selectedKeys}
                style={{ borderRight: 0, fontSize: "12px" }}
                items={allMenus}
                className="workspace-sidebar-menu [&_.ant-menu-item]:my-1 [&_.ant-menu-item-icon]:flex [&_.ant-menu-item-icon]:items-center text-[10px]"
              />

              {/* Favorites Section */}
              {favorites?.length > 0 && (
                <DragDropContext
                  onDragStart={onDragStart}
                  onDragEnd={onDragEndFavorites}
                >
                  <div
                    className="px-2 py-1 mt-4 mb-2"
                    style={{ borderBottom: `1px solid rgb(${colors.border})` }}
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

                                <div className="board-title">{board.name}</div>

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
                    style={{ borderBottom: `1px solid rgb(${colors.border})` }}
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

                                <div className="board-title">{board.name}</div>

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

      <TouchAwareTooltip
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        placement="right"
      >
        <Button
          className={`fixed flex items-center justify-center rounded-full w-6 h-6 p-0 transition-all duration-200 ease-in-out hover:shadow-lg ${
            isHovered ? "scale-105" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          size="small"
          type="text"
          icon={
            collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />
          }
          onClick={toggleSidebar}
          style={{
            top: 58,
            left: collapsed
              ? `calc(${siderSmall}px - 10px)`
              : `calc(${siderWide}px - 30px)`,
            zIndex: 501,
            backgroundColor: `rgb(${colors.surface})`,
            border: `1px solid rgb(${colors.border})`,
            color: `rgb(${colors.text})`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        />
      </TouchAwareTooltip>
      <ModalCreateBoard
        open={openCreateBoardModal}
        setOpen={setOpenCreateBoardModal}
      />
    </div>
  );
};

// Use React.memo with custom comparison to prevent unnecessary rerenders
export default React.memo(Sidebar);

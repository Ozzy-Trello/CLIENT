"use client";

import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import {
  Avatar,
  Button,
  Menu,
  Tooltip,
  Typography,
  Layout,
  Skeleton,
  Space,
} from "antd";
import Link from "next/link";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { ChevronLeft, ChevronRight, Trello, Users } from "lucide-react";
import ModalCreateBoard from "../modal-create-board";
import { useDispatch } from "react-redux";
import { MenuProps } from "antd";
import { useSelector } from "react-redux";
import {
  selectCurrentBoard,
  selectCurrentWorkspace,
  setCurrentBoard,
} from "@store/workspace_slice";
import { useBoards } from "@hooks/board";
import { useParams, useRouter } from "next/navigation";
import { Board } from "@myTypes/board";
import { usePermissions } from "@hooks/account";

const { Sider } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

const Sidebar = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  // const path = usePat
  const { collapsed, toggleSidebar, siderWide, siderSmall } =
    useWorkspaceSidebar();
  const { workspaceId, boardId } = useParams();
  const [allMenus, setAllMenus] = useState<MenuItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openCreateBoardModal, setOpenCreateBoardModal] =
    useState<boolean>(false);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);
  const { boards } = useBoards(currentWorkspace?.id || "");
  const { canCreate } = usePermissions();

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
    router.push(`/workspace/${currentWorkspace?.id}/board/${board?.id}`);
  };

  // Memoize the base menus
  const baseMenus = useMemo<MenuItem[]>(() => {
    if (!currentWorkspace) return [];

    return [
      {
        key: `/workspace/${workspaceId}/board`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${currentWorkspace.id}/board`}
          >
            Boards
          </Link>
        ),
        icon: <Trello size={16} />,
      },
      {
        key: `/workspace/${currentWorkspace.id}/members`,
        label: (
          <Link
            className="block w-full"
            href={`/workspace/${currentWorkspace.id}/members`}
          >
            Members
          </Link>
        ),
        icon: <Users size={16} />,
      },
    ];
  }, [currentWorkspace]);

  // Check if user can create boards
  const canCreateBoard = canCreate("board");

  // Build menu items separately to avoid frequent render cycles
  useEffect(() => {
    // Skip if nothing significant has changed
    const currentWorkspaceId = currentWorkspace?.id || null;
    const currentBoardsLength = boards?.length || 0;

    if (
      currentWorkspaceId === prevWorkspaceIdRef.current &&
      currentBoardsLength === prevBoardsLengthRef.current &&
      collapsed === prevCollapsedRef.current &&
      allMenus.length > 0
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
        if (!currentWorkspace) {
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
                {canCreateBoard && (
                  <Button size="small" onClick={handleOpenBoardModal}>
                    +
                  </Button>
                )}
              </div>
            ),
            icon: <span></span>,
          });
        }

        // Add board items if we have any
        if (boards?.length > 0 && currentWorkspace) {
          console.log("boards", boards);
          boards.forEach((board) => {
            fullMenus.push({
              key: `menu-board-${board.id}`,
              label: (
                <Tooltip title={board.name}>
                  <Typography.Text
                    style={{ fontSize: "14px" }}
                    className="block w-full text-left"
                  >
                    {board.name}
                  </Typography.Text>
                </Tooltip>
              ),
              icon: (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: board?.background?.startsWith("http")
                      ? "#f0f2f5"
                      : board?.background || "#f0f2f5",
                    backgroundImage:
                      board?.cover || board?.background?.startsWith("http")
                        ? `url('${board.cover || board.background}')`
                        : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {!board?.cover && !board?.background?.startsWith("http") && (
                    <span
                      style={{
                        color: "#000",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      {board?.name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
              ),
            });
          });
        }

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
    currentWorkspace,
    boards,
    canCreateBoard,
    handleOpenBoardModal,
  ]);

  const selectedKeys = useMemo(() => {
    if (boardId) {
      return [`/workspace/${workspaceId}/board/${boardId}`];
    } else {
      return [`/workspace/${workspaceId}/board`];
    }
  }, [boardId, workspaceId]);

  // Render the sidebar
  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: collapsed ? siderSmall : siderWide }}
    >
      <Sider
        className={`transition-all duration-200 ease-in-out border-r border-gray-200 ${
          collapsed ? "w-3 scrollbar-none" : ""
        }`}
        collapsed={collapsed}
        style={{
          height: "100%",
          position: "fixed",
          left: 0,
          top: 45,
          overflow: "visible",
          backgroundColor: "rgba(255, 255, 255, 0.85)", // Semi-transparent background
          backdropFilter: "blur(5px)", // Add blur effect for better readability
          zIndex: 101,
        }}
        width={collapsed ? siderSmall : siderWide}
        collapsedWidth={12}
        trigger={null}
      >
        <div
          className="transition-opacity duration-200 ease-in-out"
          style={{ opacity: collapsed ? 0 : 1 }}
        >
          {!collapsed && (
            <>
              <div className="flex justify-between items-center p-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Avatar shape="square" size={"small"}>
                    {currentWorkspace ? currentWorkspace.name.charAt(0) : ""}
                  </Avatar>
                  <Typography className="font-semibold">
                    {currentWorkspace?.name}
                  </Typography>
                </div>
              </div>

              <Menu
                mode="inline"
                defaultSelectedKeys={["1"]}
                style={{ borderRight: 0, fontSize: "12px" }}
                items={allMenus}
                onClick={(e) => {
                  const selectedBoard = boards?.find(
                    (board) => `menu-board-${board.id}` === e.key
                  );
                  if (selectedBoard) {
                    handleSelectBoardItem(selectedBoard);
                  }
                }}
                className="[&_.ant-menu-item]:my-1 [&_.ant-menu-item-icon]:flex [&_.ant-menu-item-icon]:items-center text-[10px]"
              />

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

      <Tooltip
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        placement="right"
      >
        <Button
          className={`absolute top-[58px] flex items-center justify-center rounded-full w-6 h-6 bg-white shadow-md border border-gray-200 p-0 transition-all duration-200 ease-in-out hover:shadow-lg ${
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
            left: collapsed
              ? `calc(${siderSmall}px - 10px)`
              : `calc(${siderWide}px - 30px)`,
            zIndex: 102,
          }}
        />
      </Tooltip>
      <ModalCreateBoard
        open={openCreateBoardModal}
        setOpen={setOpenCreateBoardModal}
      />
    </div>
  );
};

// Use React.memo with custom comparison to prevent unnecessary rerenders
export default React.memo(Sidebar);
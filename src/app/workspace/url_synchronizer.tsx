"use client";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useWorkspaces } from "@hooks/workspace";
import { useBoards } from "@hooks/board";
import {
  selectCurrentBoard,
  selectCurrentWorkspace,
  setCurrentBoard,
  setCurrentWorkspace,
} from "../../store/workspace_slice";
import { useSelector } from "react-redux";

/**
 * Client component to required changes based on current route in Next.js App Router
 */
const UrlSynchronizer: React.FC = () => {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);
  const { workspaceId, boardId } = useParams();
  const { workspaces } = useWorkspaces();
  const { boards } = useBoards(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );

  useEffect(() => {
    // Check if the current path matches workspace/id-workspace-* pattern
    const isWorkspacePage = /^\/workspace\/[^/]+\/?$/.test(pathname);

    // Check if the current path matches workspace/id-workspace/board/id-boards pattern
    const isBoardPage = /^\/workspace\/[^/]+\/board\/[^/]+\/?$/.test(pathname);

    // Remove all related classes first
    document.body.classList.remove("workspace-page", "board-page");

    // Add appropriate class based on the path
    if (isWorkspacePage) {
      document.body.classList.add("workspace-page");
    } else if (isBoardPage) {
      document.body.classList.add("board-page");
    }

    // Clean up when component unmounts
    return () => {
      document.body.classList.remove("workspace-page", "board-page");
    };
  }, [pathname]); // Re-run when path changes

  useEffect(() => {
    if (workspaceId) {
      const workspace = workspaces.find((item) => item.id === workspaceId);
      if (workspace?.id !== currentWorkspace?.id) {
        dispatch(setCurrentWorkspace(workspace));
      }
    }
  }, [workspaceId, workspaces]);

  useEffect(() => {
    if (boardId) {
      const board = boards.find((item) => item.id === boardId);
      if (board?.id !== currentBoard?.id) {
        dispatch(setCurrentBoard(board));
      }
    }
  }, [boardId, boards]);

  // This component doesn't render anything
  return null;
};

export default UrlSynchronizer;

"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState, useRef } from "react";
import BoardTopbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import { useListMove, useLists } from "@hooks/list";
import { useParams } from "next/navigation";
import { generateId } from "@utils/general";
// import { Droppable, DropResult, DragUpdate } from "@hello-pangea/dnd";
import List from "./draggable-list";
import ListView from "./list-view-simple";
import { Button, Input } from "antd";
import { Plus, X } from "lucide-react";
import { CardDetailProvider } from "@providers/card-detail-context";
import { CardFocusProvider } from "@providers/card-focus-context";
import CardDetails from "./card-details";
import ListSkeleton from "./list-skeleton.tsx";
import BoardScopeMenu from "@components/board-scope-menu";
import { useCardMove, useCards } from "@hooks/card";
import ModalDashcard from "@components/dashcard/modal-dashcard";
import { DashcardConfig } from "@myTypes/dashcard";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import {
  selectCurrentBoard,
  selectCurrentWorkspace,
  setCurrentBoard,
} from "@store/workspace_slice";

import { usePermissions } from "@hooks/account";
import { useBoardDetails } from "@hooks/board";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import { ApiResponse } from "@myTypes/api";
import { useRealtimeUpdates } from "@hooks/websocket";
import HorizontalSlider from "@components/horizontal-slider";
import { BoardPermissionsProvider } from "@providers/board-permissions-context";
import { useRecentlyViewed } from "@hooks/recently-viewed";
import type { DropResult, DragUpdate } from "@hello-pangea/dnd";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);

// Component that uses BoardPermissionsContext - must be inside the provider
const BoardContentWithPermissions: React.FC<{
  lists: AnyList[] | undefined;
  isLoading: boolean;
  shouldRenderLists: boolean;
  onListDragEnd: (result: DropResult) => void;
  onDragStart: (start: any) => void;
  onDragUpdate: (update: DragUpdate) => void;
  boardScrollContainerRef: React.RefObject<HTMLDivElement>;
  resolvedBoardId: string;
  updateList: any;
  deleteList: any;
  isAddingList: boolean;
  setIsAddingList: (value: boolean) => void;
  newListName: string;
  setNewListName: (value: string) => void;
  handleAddList: () => void;
  isDraggingToScroll: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}> = ({
  lists,
  isLoading,
  shouldRenderLists,
  onListDragEnd,
  onDragStart,
  onDragUpdate,
  boardScrollContainerRef,
  resolvedBoardId,
  updateList,
  deleteList,
  isAddingList,
  setIsAddingList,
  newListName,
  setNewListName,
  handleAddList,
  isDraggingToScroll,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  // Now we can safely use the context hook inside the provider
  const { canCreateList } = useBoardPermissionsContext();

  return (
    <div
      ref={boardScrollContainerRef}
      className={`h-auto min-h-[770px] w-full overflow-x-auto overflow-y-hidden custom-horizontal-scrollbar board-scroll-container ${
        isDraggingToScroll ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {shouldRenderLists && (
        <DragDropContext
          onDragEnd={onListDragEnd}
          onDragStart={onDragStart}
          onDragUpdate={onDragUpdate}
        >
          <Droppable
            droppableId="droppable-list-area"
            direction="horizontal"
            type="list"
          >
            {(provided, snapshot) => {
              return (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-4 p-4 items-start"
                  style={{
                    backgroundColor: snapshot.isDraggingOver
                      ? "#e3f2fd"
                      : "transparent",
                    minWidth: "calc(100% + 100px)", // Force content to be wider than container
                    width: "max-content", // Allow content to expand beyond container width
                  }}
                >
                  {lists?.map((list: AnyList, index: number) => {
                    return (
                      <List
                        key={list.id}
                        list={list}
                        index={index}
                        boardId={resolvedBoardId}
                        updateList={updateList}
                        deleteList={deleteList}
                      />
                    );
                  })}
                  {provided.placeholder}

                  {/* Add list section - only show if user can create lists */}
                  {canCreateList() && (
                    <>
                      {isAddingList ? (
                        <div className="add-list-wrapper p-4 rounded-sm bg-white shadow-sm">
                          <Input
                            type="text"
                            placeholder="New List Title"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onPressEnter={handleAddList}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <Button size="small" onClick={handleAddList}>
                              Add List
                            </Button>
                            <Button
                              size="small"
                              onClick={() => setIsAddingList(false)}
                              icon={<X size={15} />}
                            />
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setIsAddingList(true)}
                          className="mt-2"
                          icon={<Plus size={15} />}
                        >
                          Add a list
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            }}
          </Droppable>
        </DragDropContext>
      )}

      {!shouldRenderLists && <ListSkeleton />}
    </div>
  );
};

const Board: React.FC = () => {
  const { boardId, workspaceId } = useParams();
  const theme = useSelector(selectTheme);

  // @hello-pangea/dnd handles touch and mouse events automatically
  const dispatch = useDispatch();

  // Ref for the scrollable board container to control scrolling during drag
  const boardScrollContainerRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll state management
  const [isDraggingToScroll, setIsDraggingToScroll] = useState(false);
  const dragScrollState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  });

  // Mouse event handlers for drag-to-scroll
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if a card/list drag is already in progress
    if ((window as any).__DRAG_IN_PROGRESS__) {
      return;
    }

    // Only start drag-to-scroll if clicking on the background (not on draggable elements)
    const target = e.target as HTMLElement;

    // More comprehensive check for draggable elements and their children
    if (
      target.closest("[data-rbd-draggable-id]") ||
      target.closest("[data-rbd-droppable-id]") ||
      target.closest(".draggable-card-container") ||
      target.closest(".draggable-list-container") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest(".ant-btn") ||
      target.closest(".more-options-btn")
    ) {
      return;
    }

    const container = boardScrollContainerRef.current;
    if (!container) return;

    dragScrollState.current.isDown = true;
    dragScrollState.current.startX = e.pageX - container.offsetLeft;
    dragScrollState.current.scrollLeft = container.scrollLeft;
    setIsDraggingToScroll(true);

    // Prevent text selection during drag
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Stop drag-to-scroll if a card/list drag starts
    if ((window as any).__DRAG_IN_PROGRESS__) {
      dragScrollState.current.isDown = false;
      setIsDraggingToScroll(false);
      return;
    }

    if (!dragScrollState.current.isDown) return;

    const container = boardScrollContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragScrollState.current.startX) * 2; // Multiply by 2 for faster scrolling
    container.scrollLeft = dragScrollState.current.scrollLeft - walk;
  }, []);

  const handleMouseUp = useCallback(() => {
    dragScrollState.current.isDown = false;
    setIsDraggingToScroll(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragScrollState.current.isDown = false;
    setIsDraggingToScroll(false);
  }, []);

  // Touch event handlers for mobile drag-to-scroll
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Check if a card/list drag is already in progress
    if ((window as any).__DRAG_IN_PROGRESS__) {
      return;
    }

    // Only start drag-to-scroll if touching the background (not on draggable elements)
    const target = e.target as HTMLElement;

    // More comprehensive check for draggable elements and their children
    if (
      target.closest("[data-rbd-draggable-id]") ||
      target.closest("[data-rbd-droppable-id]") ||
      target.closest(".draggable-card-container") ||
      target.closest(".draggable-list-container") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest(".ant-btn") ||
      target.closest(".more-options-btn")
    ) {
      return;
    }

    const container = boardScrollContainerRef.current;
    if (!container || e.touches.length !== 1) return;

    const touch = e.touches[0];
    dragScrollState.current.isDown = true;
    dragScrollState.current.startX = touch.pageX - container.offsetLeft;
    dragScrollState.current.scrollLeft = container.scrollLeft;
    setIsDraggingToScroll(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Stop drag-to-scroll if a card/list drag starts
    if ((window as any).__DRAG_IN_PROGRESS__) {
      dragScrollState.current.isDown = false;
      setIsDraggingToScroll(false);
      return;
    }

    if (!dragScrollState.current.isDown || e.touches.length !== 1) return;

    const container = boardScrollContainerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    const x = touch.pageX - container.offsetLeft;
    const walk = (x - dragScrollState.current.startX) * 2; // Multiply by 2 for faster scrolling
    container.scrollLeft = dragScrollState.current.scrollLeft - walk;

    // Prevent default touch behavior only when actively scrolling
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragScrollState.current.isDown = false;
    setIsDraggingToScroll(false);
  }, []);

  const resolvedBoardId = Array.isArray(boardId) ? boardId[0] : boardId;
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId;

  const { lists, addList, isLoading, updateList, deleteList } =
    useLists(resolvedBoardId);

  // Fetch board details and update Redux state when boardId changes
  const { board: boardDetails } = useBoardDetails(
    resolvedBoardId || "",
    resolvedWorkspaceId,
    {
      enabled: !!resolvedBoardId,
    }
  );

  const [isAddingList, setIsAddingList] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const [boardScopeMenu, setBoardScopeMenu] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">(() => {
    // Attempt to restore from localStorage per board
    try {
      const key = `board-view-mode-${resolvedBoardId}`;
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      return (stored === "list" || stored === "kanban") ? (stored as "kanban" | "list") : "kanban";
    } catch {
      return "kanban";
    }
  });
  const { addCard } = useCards("", "");
  const { moveCard } = useCardMove(resolvedBoardId);
  const { moveList } = useListMove();
  const queryClient = useQueryClient();
  const [openDashcardModal, setOpenDashcardModal] = useState<boolean>(false);
  const [dashcardConfig, setDashcardConfig] = useState<DashcardConfig>();
  const selectedBoard = useSelector(selectCurrentBoard);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const { canCreate } = usePermissions();
  const { addRecentlyViewedBoard } = useRecentlyViewed();

  // Enable real-time updates via WebSocket
  useRealtimeUpdates();

  // Track current drag state for immediate updates
  const currentDragState = useRef<{
    cardId: string;
    originalListId: string;
    currentListId: string;
    originalCard: Card | null;
    originalPosition: number;
    currentPosition?: number;
  } | null>(null);

  // Show lists directly from React Query cache - no local state needed
  const shouldRenderLists =
    !isLoading && Array.isArray(lists) && lists.length >= 0;

  // Update Redux state when board details are fetched (same pattern as sidebar)
  useEffect(() => {
    if (boardDetails && boardDetails.id !== selectedBoard?.id) {
      dispatch(setCurrentBoard(boardDetails));

      // Add to recently viewed boards
      addRecentlyViewedBoard({
        id: boardDetails.id,
        name: boardDetails.name || "Untitled Board",
        workspaceId: resolvedWorkspaceId,
        workspaceName: currentWorkspace?.name || "Untitled Workspace",
      });
    }
  }, [
    boardDetails,
    selectedBoard?.id,
    dispatch,
    addRecentlyViewedBoard,
    resolvedWorkspaceId,
  ]);

  const onListDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, type, draggableId } = result;

      // Drop outside any droppable area
      if (!destination) {
        // Clean up immediately if dropped outside
        if (type === "card" || type === "list") {
          if (type === "card") {
            currentDragState.current = null;
          }
          // Clean up immediately without delay
          document.body.classList.remove("dragging");
          (window as any).__DRAG_IN_PROGRESS__ = false;
        }
        return;
      }

      // If dropped in the same position, exit
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        // Clean up immediately if no actual move
        if (type === "card" || type === "list") {
          if (type === "card") {
            currentDragState.current = null;
          }
          // Clean up immediately without delay
          document.body.classList.remove("dragging");
          (window as any).__DRAG_IN_PROGRESS__ = false;
        }
        return;
      }

      // Handle the drag end based on type
      switch (type) {
        case "list":
          handleListDragEnd(draggableId, source.index, destination.index);
          break;
        case "card":
          handleCardDragEnd(
            source.droppableId,
            source.index,
            destination.droppableId,
            destination.index,
            draggableId
          );
          break;
      }

      // Note: Cleanup is now handled in the mutation's onSettled callback
    },
    [moveCard]
  );

  const onDragStart = (start: any): void => {
    // Simple drag start - just add dragging class for CSS transitions
    if (start.type === "card" || start.type === "list") {
      document.body.classList.add("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = true;
    }

    // Initialize drag state tracking for cards
    if (start.type === "card") {
      const sourceListId = start.source.droppableId?.replaceAll(
        "droppable-card-area-",
        ""
      );
      const sourceCards = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(sourceListId)
      );
      const originalCard = sourceCards?.data?.find(
        (c) => c.id === start.draggableId
      );

      const newDragState = {
        cardId: start.draggableId,
        originalListId: sourceListId,
        currentListId: sourceListId,
        originalCard: originalCard || null,
        originalPosition: start.source.index,
      };

      currentDragState.current = newDragState;
    }
  };

  const onDragUpdate = (update: DragUpdate): void => {
    if (!update.destination) return;

    // Handle list drags - keep the existing logic for lists as it seems to work fine
    if (update.type === "list") {
      const listId = update.draggableId?.replaceAll("draggable-list-", "");
      const sourceIndex = update.source.index;
      const destIndex = update.destination.index;

      if (sourceIndex === destIndex) return; // No change

      // Optimistically update list order (async to match useListMove pattern)
      (async () => {
        await queryClient.cancelQueries({
          queryKey: ["lists", resolvedBoardId],
        });

        queryClient.setQueryData<ApiResponse<AnyList[]>>(
          ["lists", resolvedBoardId],
          (old) => {
            if (!old?.data) return old;

            const lists = [...old.data];
            const fromIndex = lists.findIndex((l) => l.id === listId);
            if (fromIndex === -1) {
              return old;
            }

            const [moved] = lists.splice(fromIndex, 1);
            const toIndex = Math.min(destIndex, lists.length);
            lists.splice(toIndex, 0, moved);

            // Recalculate position based on neighbors
            for (let i = 0; i < lists.length; i++) {
              lists[i].position = (i + 1) * 10000;
            }

            return { ...old, data: lists };
          }
        );
      })();
      return;
    }

    // Handle card drags - simplified to only track state, no cache updates
    if (update.type !== "card" || !currentDragState.current) {
      return;
    }

    const newListId = update.destination.droppableId?.replaceAll(
      "droppable-card-area-",
      ""
    );

    if (!newListId) return;

    // Only update the current drag state tracking - no cache updates
    // This prevents re-renders during drag that interfere with touch events
    if (currentDragState.current) {
      currentDragState.current = {
        ...currentDragState.current,
        currentListId: newListId,
        currentPosition: update.destination.index,
      };
    }
  };

  const handleListDragEnd = (
    draggabelId: string,
    sourceIndex: number,
    destIndex: number
  ): void => {
    const listId = draggabelId?.replaceAll("draggable-list-", "");

    // Clean up drag state for lists
    setTimeout(() => {
      document.body.classList.remove("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = false;
    }, 50);

    // Only call the API - let optimistic updates handle the UI
    moveList({
      listId: listId,
      previousPosition: sourceIndex,
      targetPosition: destIndex,
      boardId: resolvedBoardId,
    });
  };

  const handleCardDragEnd = (
    sourceList: string,
    sourceIndex: number,
    destList: string,
    destIndex: number,
    cardId: string
  ): void => {
    const sourceListId = sourceList?.replaceAll("droppable-card-area-", "");
    const destListId = destList?.replaceAll("droppable-card-area-", "");

    // Store the original position and list BEFORE clearing state
    const originalPosition = currentDragState.current?.originalPosition;
    const originalListId = currentDragState.current?.originalListId;
    const originalCard = currentDragState.current?.originalCard;

    // Determine if there was an actual move by comparing final position with original position
    const actualMove =
      currentDragState.current &&
      originalPosition !== undefined &&
      originalListId &&
      (destListId !== originalListId ||
        (destListId === originalListId && destIndex !== originalPosition));

    // Clean up drag state first
    currentDragState.current = null;

    // Use setTimeout to ensure the cleanup happens after any pending transitions
    setTimeout(() => {
      document.body.classList.remove("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = false;
    }, 50);

    // Perform cache updates now that drag is complete (prevents re-renders during drag)
    if (actualMove && originalCard && originalListId) {
      // Handle cross-list moves
      if (destListId !== originalListId) {
        // Remove card from original list
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(originalListId),
          (old) => {
            if (!old?.data)
              return { status_code: 200, message: "Success", data: [] };
            const newData = old.data.filter((c) => c.id !== cardId);
            return { ...old, data: newData };
          }
        );

        // Add card to destination list
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(destListId),
          (old) => {
            if (!old?.data) {
              const updatedCard = { ...originalCard, listId: destListId };
              return {
                status_code: 200,
                message: "Success",
                data: [updatedCard],
              };
            }

            const newCards = [...old.data];
            const insertPosition = Math.min(destIndex, newCards.length);
            const updatedCard = { ...originalCard, listId: destListId };
            newCards.splice(insertPosition, 0, updatedCard);

            return { ...old, data: newCards };
          }
        );
      } else {
        // Handle same-list reordering
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(destListId),
          (old) => {
            if (!old?.data)
              return { status_code: 200, message: "Success", data: [] };

            const newCards = [...old.data];
            // Remove the card from its current position
            const cardIndex = newCards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) return old;

            const [movedCard] = newCards.splice(cardIndex, 1);
            // Insert at new position
            const insertPosition = Math.min(destIndex, newCards.length);
            newCards.splice(insertPosition, 0, movedCard);

            return { ...old, data: newCards };
          }
        );
      }

      // Call the mutation for server sync
      moveCard({
        cardId: cardId,
        previousListId: originalListId,
        targetListId: destListId,
        previousPosition: originalPosition,
        targetPosition: destIndex,
      });
    }
  };

  const handleAddList = (): void => {
    if (!newListName || !resolvedBoardId) return;

    const newList: AnyList = {
      id: generateId(),
      boardId: resolvedBoardId,
      name: newListName,
    };
    addList(newList);
    setNewListName("");
    setIsAddingList(false);
  };

  const onDashcardSave = (dashcardConfig: DashcardConfig): void => {
    if (lists?.length > 0) {
      const listId = lists[0]?.id;
      const card: Card = {
        id: dashcardConfig.id,
        listId: listId,
        name: dashcardConfig?.name,
        type: EnumCardType.Dashcard,
        dashConfig: dashcardConfig,
      };

      addCard({ card, listId });
    }
  };

  // Persist view mode per board
  useEffect(() => {
    try {
      const key = `board-view-mode-${resolvedBoardId}`;
      window.localStorage.setItem(key, viewMode);
    } catch {}
  }, [viewMode, resolvedBoardId]);

  return (
    <div className="h-auto min-h-[600px] mr-4 pt-[50px]" style={{ width: "100%" }}>
      <BoardPermissionsProvider board={boardDetails}>
        <BoardTopbar
          setBoardScopeMenuOpen={setBoardScopeMenu}
          board={boardDetails}
          onTrackClick={() => setOpenDashcardModal(true)}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
        />
        <CardFocusProvider>
          <CardDetailProvider>
            <div className="relative pb-10">
              {viewMode === "kanban" ? (
                <>
                  {/* Horizontal Slider for manual navigation - positioned inside board area */}
                  <BoardContentWithPermissions
                    lists={lists}
                    isLoading={isLoading}
                    shouldRenderLists={shouldRenderLists}
                    onListDragEnd={onListDragEnd}
                    onDragStart={onDragStart}
                    onDragUpdate={onDragUpdate}
                    boardScrollContainerRef={boardScrollContainerRef}
                    resolvedBoardId={resolvedBoardId}
                    updateList={updateList}
                    deleteList={deleteList}
                    isAddingList={isAddingList}
                    setIsAddingList={setIsAddingList}
                    newListName={newListName}
                    setNewListName={setNewListName}
                    handleAddList={handleAddList}
                    isDraggingToScroll={isDraggingToScroll}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  <HorizontalSlider
                    containerRef={boardScrollContainerRef}
                    widthPercent={20}
                  />
                </>
              ) : (
                <ListView
                  lists={lists}
                  isLoading={isLoading}
                  shouldRenderLists={shouldRenderLists}
                  onListDragEnd={onListDragEnd}
                  onDragStart={onDragStart}
                  onDragUpdate={onDragUpdate}
                  resolvedBoardId={resolvedBoardId}
                  updateList={updateList}
                  deleteList={deleteList}
                  isAddingList={isAddingList}
                  setIsAddingList={setIsAddingList}
                  newListName={newListName}
                  setNewListName={setNewListName}
                  handleAddList={handleAddList}
                />
              )}
            </div>

            <CardDetails />

            <BoardScopeMenu
              visible={boardScopeMenu}
              setIsVisible={setBoardScopeMenu}
            />

            <ModalDashcard
              open={openDashcardModal}
              setOpen={setOpenDashcardModal}
              onSave={onDashcardSave}
              initialData={dashcardConfig}
            />
          </CardDetailProvider>
        </CardFocusProvider>
      </BoardPermissionsProvider>
    </div>
  );
};

export default Board;

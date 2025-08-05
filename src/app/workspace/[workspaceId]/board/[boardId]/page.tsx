"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState, useRef } from "react";
import BoardTopbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme, selectUser } from "@store/app_slice";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { useListMove, useLists } from "@hooks/list";
import { useParams, useSearchParams } from "next/navigation";
import { generateId } from "@utils/general";
import { Droppable, DropResult, DragUpdate } from "@hello-pangea/dnd";
import List from "./draggable-list";
import { Button, Input } from "antd";
import { Plus, X } from "lucide-react";
import {
  CardDetailProvider,
  useCardDetailContext,
} from "@providers/card-detail-context";
import { CardFocusProvider, useCardFocus } from "@providers/card-focus-context";
import CardDetails from "./card-details";
import ListSkeleton from "./list-skeleton.tsx";
import BoardScopeMenu from "@components/board-scope-menu";
import { useCardMove, useCards } from "@hooks/card";
import ModalDashcard from "@components/dashcard/modal-dashcard";
import { DashcardConfig } from "@myTypes/dashcard";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { selectCurrentBoard, setCurrentBoard } from "@store/workspace_slice";
import { useRealtimeUpdates } from "@hooks/websocket";
import { usePermissions } from "@hooks/account";
import { useBoardDetails } from "@hooks/board";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import { ApiResponse } from "@myTypes/api";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Board: React.FC = () => {
  const { boardId, workspaceId } = useParams();
  const searchParams = useSearchParams();
  const theme = useSelector(selectTheme);
  const { colors } = theme;
  const selectedUser = useSelector(selectUser);
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const dispatch = useDispatch();

  const resolvedBoardId = Array.isArray(boardId) ? boardId[0] : boardId;
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId;

  const { lists, addList, pagination, isLoading, updateList } =
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
  const { updateCard, addCard } = useCards("", "");
  const { moveCard } = useCardMove(resolvedBoardId);
  const { moveList } = useListMove();
  const queryClient = useQueryClient();
  const [openDashcardModal, setOpenDashcardModal] = useState<boolean>(false);
  const [dashcardConfig, setDashcardConfig] = useState<DashcardConfig>();
  const selectedBoard = useSelector(selectCurrentBoard);
  const { isConnected } = useRealtimeUpdates();
  const { canCreate } = usePermissions();

  // Track current drag state for immediate updates
  const currentDragState = useRef<{
    cardId: string;
    originalListId: string;
    currentListId: string;
    originalCard: Card | null;
    originalPosition: number;
  } | null>(null);

  // Show lists directly from React Query cache - no local state needed
  const shouldRenderLists =
    !isLoading && Array.isArray(lists) && lists.length >= 0;

  // Update Redux state when board details are fetched (same pattern as sidebar)
  useEffect(() => {
    if (boardDetails && boardDetails.id !== selectedBoard?.id) {
      dispatch(setCurrentBoard(boardDetails));
    }
  }, [boardDetails, selectedBoard?.id, dispatch]);

  const onListDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, type, draggableId } = result;

      console.log("🔍 DEBUG onListDragEnd called:", {
        type,
        draggableId,
        destination,
        source,
        currentDragState: currentDragState.current,
      });

      // Special debugging for list drags
      if (type === "list") {
        const sourceIndex = source.index;
        const destIndex = destination?.index;
        console.log(`[LIST DRAG END DEBUG] Source index: ${sourceIndex}, Dest index: ${destIndex}`);
        
        // Check if this involves problematic lists
        if (sourceIndex >= 7 && sourceIndex <= 11) {
          console.log(`[PROBLEMATIC LIST END] List at index ${sourceIndex} was dragged!`);
        }
        if (destIndex !== undefined && destIndex >= 7) {
          console.log(`[PROBLEMATIC DEST] Trying to drop at index ${destIndex} (>= 7)`);
        }
      }

      // Drop outside any droppable area
      if (!destination) {
        console.log("🔍 DEBUG: Dropped outside, clearing state for type:", type);
        // Clean up immediately if dropped outside
        if (type === "card" || type === "list") {
          if (type === "card") {
            currentDragState.current = null;
          }
          setTimeout(() => {
            document.body.classList.remove("dragging");
            (window as any).__DRAG_IN_PROGRESS__ = false;
          }, 50);
        }
        return;
      }

      // If dropped in the same position, exit
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        console.log("🔍 DEBUG: Dropped in same position, clearing state for type:", type);
        // Clean up immediately if no actual move
        if (type === "card" || type === "list") {
          if (type === "card") {
            currentDragState.current = null;
          }
          setTimeout(() => {
            document.body.classList.remove("dragging");
            (window as any).__DRAG_IN_PROGRESS__ = false;
          }, 50);
        }
        return;
      }

      console.log("🔍 DEBUG: About to handle drag end for type:", type);

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
    console.log(`[DRAG START] Type: ${start.type}, ID: ${start.draggableId}, Source: ${start.source.droppableId}, Index: ${start.source.index}`);
    
    // Log scroll position for debugging
    const scrollContainer = document.querySelector('[class*="overflow-x-auto"]');
    if (scrollContainer) {
      console.log(`[SCROLL DEBUG] Container scroll position: ${scrollContainer.scrollLeft}px`);
    }
    
    // Special debugging for list drags
    if (start.type === "list") {
      const listId = start.draggableId?.replaceAll("draggable-list-", "");
      const listIndex = start.source.index;
      console.log(`[LIST DRAG START] Successfully started dragging list at index ${listIndex}, ID: ${listId}`);
      
      // Check if this is one of the problematic lists (8-12)
      if (listIndex >= 7 && listIndex <= 11) {
        console.log(`[PROBLEMATIC LIST] This is list index ${listIndex} - one of the problematic ones!`);
      }
    }
    
    // Ensure clean state before starting drag
    document.body.classList.remove("dragging");
    
    // Add dragging class and set global flag for both card and list drags
    if (start.type === "card" || start.type === "list") {
      // Add dragging class to body to disable transitions
      document.body.classList.add("dragging");
      // Set a global flag to prevent any cache operations during drag
      (window as any).__DRAG_IN_PROGRESS__ = true;
      
      if (start.type === "list") {
        console.log(`[LIST DRAG START] List ID: ${start.draggableId}, Index: ${start.source.index}`);
      }
    }

    // Initialize drag state tracking for cards
    if (start.type === "card") {
      const sourceListId = start.source.droppableId?.replaceAll("droppable-card-area-", "");
      const sourceCards = queryClient.getQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(sourceListId)
      );
      const originalCard = sourceCards?.data?.find((c) => c.id === start.draggableId);

      const newDragState = {
        cardId: start.draggableId,
        originalListId: sourceListId,
        currentListId: sourceListId,
        originalCard: originalCard || null,
        originalPosition: start.source.index,
      };

      console.log("🔍 DEBUG onDragStart:", {
        startType: start.type,
        draggableId: start.draggableId,
        sourceListId,
        sourceIndex: start.source.index,
        originalCard,
        newDragState,
      });

      currentDragState.current = newDragState;
    }
  };

  const onDragUpdate = (update: DragUpdate): void => {
    if (!update.destination) return;

    // Handle list drags
     if (update.type === "list") {
       const listId = update.draggableId?.replaceAll("draggable-list-", "");
       const sourceIndex = update.source.index;
       const destIndex = update.destination.index;

       console.log("🔍 DEBUG List onDragUpdate:", {
         listId,
         sourceIndex,
         destIndex,
         resolvedBoardId,
         queryKey: ["lists", resolvedBoardId]
       });

       // Special debugging for problematic positions
       if (destIndex >= 7) {
         console.log(`[POSITION DEBUG] Trying to drag to position ${destIndex} (>= 7)!`);
         console.log(`[POSITION DEBUG] Source: ${sourceIndex}, Destination: ${destIndex}`);
         console.log(`[POSITION DEBUG] This should be allowed but might be blocked somewhere`);
       }

       if (sourceIndex === destIndex) return; // No change

       // Optimistically update list order (async to match useListMove pattern)
        (async () => {
          await queryClient.cancelQueries({ queryKey: ["lists", resolvedBoardId] });
          
          queryClient.setQueryData<ApiResponse<AnyList[]>>(
            ["lists", resolvedBoardId],
            (old) => {
              console.log("🔍 DEBUG List optimistic update - old data:", old);
              if (!old?.data) return old;

              const lists = [...old.data];
              const fromIndex = lists.findIndex((l) => l.id === listId);
              if (fromIndex === -1) {
                console.log("❌ List not found in data:", listId, lists.map(l => l.id));
                return old;
              }

              const [moved] = lists.splice(fromIndex, 1);
              const toIndex = Math.min(destIndex, lists.length);
              lists.splice(toIndex, 0, moved);

              // Recalculate position based on neighbors
              for (let i = 0; i < lists.length; i++) {
                lists[i].position = (i + 1) * 10000;
              }

              console.log("✅ List optimistic update - new data:", { ...old, data: lists });
              return { ...old, data: lists };
            }
          );
        })();
       return;
     }

    // Handle card drags
    if (update.type !== "card" || !currentDragState.current) {
      return;
    }

    const newListId = update.destination.droppableId?.replaceAll("droppable-card-area-", "");
    const { cardId, originalCard, currentListId } = currentDragState.current;

    if (!originalCard || !newListId) return;

    // Handle both cross-list moves AND same-list reordering
    if (newListId !== currentListId) {
      // Cross-list move: Remove from current list and add to new list
      
      // Remove card from current list
      queryClient.setQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(currentListId),
        (old) => {
          if (!old?.data) return { status_code: 200, message: "Success", data: [] };
          const newData = old.data.filter((c) => c.id !== cardId);
          return { ...old, data: newData };
        }
      );

      // Add card to new list
      queryClient.setQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(newListId),
        (old) => {
          if (!old?.data) {
            const updatedCard = { ...originalCard, listId: newListId };
            return { status_code: 200, message: "Success", data: [updatedCard] };
          }

          const newCards = [...old.data];
          const insertPosition = Math.min(update.destination!.index, newCards.length);
          const updatedCard = { ...originalCard, listId: newListId };
          newCards.splice(insertPosition, 0, updatedCard);
          
          return { ...old, data: newCards };
        }
      );

      // Update the current drag state
      currentDragState.current = currentDragState.current ? { ...currentDragState.current, currentListId: newListId } : null;
    } else {
      // Same-list reordering: Update the order within the same list
      queryClient.setQueryData<ApiResponse<Card[]>>(
        queryKeys.cards.list(newListId),
        (old) => {
          if (!old?.data) return { status_code: 200, message: "Success", data: [] };

          const newCards = [...old.data];
          // Remove the card from its current position
          const cardIndex = newCards.findIndex((c) => c.id === cardId);
          if (cardIndex === -1) return old;

          const [movedCard] = newCards.splice(cardIndex, 1);
          // Insert at new position
          const insertPosition = Math.min(update.destination!.index, newCards.length);
          newCards.splice(insertPosition, 0, movedCard);
          
          return { ...old, data: newCards };
        }
      );
    }
  };

  const handleListDragEnd = (
    draggabelId: string,
    sourceIndex: number,
    destIndex: number
  ): void => {
    const listId = draggabelId?.replaceAll("draggable-list-", "");
    
    console.log(`[LIST DRAG END] List ID: ${listId}, Source: ${sourceIndex}, Dest: ${destIndex}`);
    console.log(`[LIST DRAG END] Resolved Board ID: ${resolvedBoardId}`);

    // Clean up drag state for lists
    setTimeout(() => {
      document.body.classList.remove("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = false;
    }, 50);

    // Only call the API - let optimistic updates handle the UI
    console.log(`[LIST DRAG END] Calling moveList mutation with:`, {
      listId,
      previousPosition: sourceIndex,
      targetPosition: destIndex,
      boardId: resolvedBoardId,
    });
    
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

    console.log("🔍 DEBUG handleCardDragEnd:", {
      sourceListId,
      destListId,
      sourceIndex,
      destIndex,
      cardId,
      currentDragState: currentDragState.current,
    });

    // Store the original position and list BEFORE clearing state
    const originalPosition = currentDragState.current?.originalPosition;
    const originalListId = currentDragState.current?.originalListId;

    console.log("🔍 DEBUG stored values:", {
      originalPosition,
      originalListId,
      hasCurrentDragState: !!currentDragState.current,
    });

    // Cache updates are now handled by onDragUpdate, so we just need to:
    // 1. Call the mutation for server sync (if there was an actual move)
    // 2. Clean up drag state

    // Determine if there was an actual move by comparing final position with original position
    const actualMove = currentDragState.current && originalPosition !== undefined && originalListId && (
      destListId !== originalListId || 
      (destListId === originalListId && destIndex !== originalPosition)
    );

    console.log("🔍 DEBUG move detection:", {
      actualMove,
      hasCurrentDragState: !!currentDragState.current,
      destListId,
      originalListId,
      destIndex,
      originalPosition,
      listChanged: destListId !== originalListId,
      positionChanged: destListId === originalListId && destIndex !== originalPosition,
    });

    // Clean up drag state and UI with a small delay to ensure transitions are disabled
    currentDragState.current = null;
    
    // Use setTimeout to ensure the cleanup happens after any pending transitions
    setTimeout(() => {
      document.body.classList.remove("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = false;
    }, 50);

    // Always call the mutation if there was an actual move from the original position
    if (actualMove) {
      console.log("🚀 Calling moveCard mutation:", {
        cardId,
        previousListId: originalListId,
        targetListId: destListId,
        previousPosition: originalPosition,
        targetPosition: destIndex,
      });
      
      // Call the mutation for server sync (cache is already updated by onDragUpdate)
      moveCard({
        cardId: cardId,
        previousListId: originalListId,
        targetListId: destListId,
        previousPosition: originalPosition,
        targetPosition: destIndex,
      });
    } else {
      console.log("❌ NOT calling moveCard mutation because:", {
        actualMove,
        hasCurrentDragState: !!currentDragState.current,
        originalPositionDefined: originalPosition !== undefined,
        originalListIdExists: !!originalListId,
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

  // Check if user can create lists
  const canCreateList = canCreate("list");

  return (
    <div
      className="h-screen overflow-y-hidden mr-4"
      style={{
        width: collapsed
          ? `calc(100%-${siderSmall})`
          : `calc(100%-${siderWide})`,
        // Background is now applied at the body level for full-page effect
      }}
    >
      <BoardTopbar
        boardScopeMenuOpen={boardScopeMenu}
        setBoardScopeMenuOpen={setBoardScopeMenu}
        openDashcardModal={openDashcardModal}
        setOpenDashcardModal={setOpenDashcardModal}
      />
      <CardFocusProvider>
        <CardDetailProvider>
          <div className="pt-[50px] h-[calc(100vh-30px)] overflow-x-auto overflow-y-hidden min-w-[200px]">
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
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex gap-4 p-4 items-start"
                    >
                      {lists?.map((list: AnyList, index: number) => {
                        return (
                          <List
                            key={list.id}
                            list={list}
                            index={index}
                            boardId={resolvedBoardId}
                            updateList={updateList}
                          />
                        );
                      })}
                      {provided.placeholder}

                      {/* Add list section - only show if user can create lists */}
                      {canCreateList && (
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
                  )}
                </Droppable>
              </DragDropContext>
            )}

            {!shouldRenderLists && <ListSkeleton />}
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
    </div>
  );
};

export default Board;

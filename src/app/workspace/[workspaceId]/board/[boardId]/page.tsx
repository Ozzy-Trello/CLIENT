"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState, useRef } from "react";
import BoardTopbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { useListMove, useLists } from "@hooks/list";
import { useParams } from "next/navigation";
import { generateId } from "@utils/general";
// import { Droppable, DropResult, DragUpdate } from "@hello-pangea/dnd";
import List from "./draggable-list";
import { Button, Input } from "antd";
import { Plus, X } from "lucide-react";
import { CardDetailProvider } from "@providers/card-detail-context";
import { CardFocusProvider } from "@providers/card-focus-context";
import CardDetails from "./card-details";
import ListSkeleton from "./list-skeleton.tsx";
import BoardScopeMenu from "@components/board-scope-menu";
import { useCardMove, useCards } from "@hooks/card";
import { cards } from "@api/card";
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
import { useBoardDetails, useBoards } from "@hooks/board";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import { ApiResponse } from "@myTypes/type";
import { useRealtimeUpdates } from "@hooks/websocket";
import HorizontalSlider from "@components/horizontal-slider";
import { BoardPermissionsProvider } from "@providers/board-permissions-context";
import { useRecentlyViewed } from "@hooks/recently-viewed";
import { usePrefetchDashcardCounts } from "@hooks/prefetch-dashcard-counts";
import type { DropResult, DragUpdate } from "@hello-pangea/dnd";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);

const CARD_PAGE_SIZE = 10;

function areListCardsEqual(current: Card[] = [], next: Card[] = []) {
  return (
    current.length === next.length &&
    current.every((card, idx) => {
      const nextCard = next[idx];
      if (!nextCard || card.id !== nextCard.id) return false;

      const currentLabels = JSON.stringify(
        card.labels?.map((label) => label.id).sort() || []
      );
      const nextLabels = JSON.stringify(
        nextCard.labels?.map((label) => label.id).sort() || []
      );
      if (currentLabels !== nextLabels) return false;

      const currentCFs = JSON.stringify(card.customFields || []);
      const nextCFs = JSON.stringify(nextCard.customFields || []);
      if (currentCFs !== nextCFs) return false;

      if (card.name !== nextCard.name) return false;
      if (card.description !== nextCard.description) return false;
      if (card.dueDate !== nextCard.dueDate) return false;
      if (card.isComplete !== nextCard.isComplete) return false;

      return true;
    })
  );
}

function buildCardsPagination(
  cardsCount: number,
  totalCards?: number,
  currentPage: number = 1,
  previous?: {
    currentPage: number;
    hasMore: boolean;
    totalCards: number;
  }
) {
  const resolvedTotal = totalCards ?? previous?.totalCards ?? cardsCount;

  return {
    currentPage,
    hasMore:
      totalCards != null
        ? cardsCount < totalCards
        : previous?.hasMore ?? cardsCount >= CARD_PAGE_SIZE,
    totalCards: resolvedTotal,
  };
}

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
  collapsedLists: Record<string, boolean>;
  onToggleCollapse: (listId: string) => void;
  localCards: Record<string, Card[]>;
  cardsPagination: Record<
    string,
    {
      currentPage: number;
      hasMore: boolean;
      totalCards: number;
    }
  >;
  loadingMoreByListId: Record<string, boolean>;
  loadMoreErrors: Record<string, string | null>;
  addingCardByListId: Record<string, boolean>;
  onLoadMoreCards: (listId: string) => void;
  onRetryLoadMoreCards: (listId: string) => void;
  onAddCard: ({ card, listId }: { card: Partial<Card>; listId: string }) => void;
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
  collapsedLists,
  onToggleCollapse,
  localCards,
  cardsPagination,
  loadingMoreByListId,
  loadMoreErrors,
  addingCardByListId,
  onLoadMoreCards,
  onRetryLoadMoreCards,
  onAddCard,
}) => {
    // Now we can safely use the context hook inside the provider
    const { canCreateList } = useBoardPermissionsContext();

    return (
      <div
        ref={boardScrollContainerRef}
        className={`h-auto min-h-[calc(100dvh-60px)] sm:min-h-[770px] w-full overflow-x-auto overflow-y-hidden custom-horizontal-scrollbar board-scroll-container ${isDraggingToScroll ? "cursor-grabbing select-none" : "cursor-grab"
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
            autoScrollerOptions={{ disabled: true }}
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
                      const listCards = localCards[list.id] || [];
                      const pagination = cardsPagination[list.id] || {
                        currentPage: 1,
                        hasMore: false,
                        totalCards: 0,
                      };

                      return (
                        <List
                          key={list.id}
                          list={list}
                          index={index}
                          boardId={resolvedBoardId}
                          updateList={updateList}
                          deleteList={deleteList}
                          collapsed={!!collapsedLists[list.id]}
                          onToggleCollapse={onToggleCollapse}
                          cards={listCards}
                          hasMoreCards={pagination.hasMore}
                          isLoadingMore={!!loadingMoreByListId[list.id]}
                          onLoadMore={() => onLoadMoreCards(list.id)}
                          totalCards={pagination.totalCards}
                          addCard={onAddCard}
                          isAddingCard={!!addingCardByListId[list.id]}
                          loadMoreError={loadMoreErrors[list.id] || null}
                          onRetryLoadMore={() => onRetryLoadMoreCards(list.id)}
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
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();

  // @hello-pangea/dnd handles touch and mouse events automatically
  const dispatch = useDispatch();

  // Ref for the scrollable board container to control scrolling during drag
  const boardScrollContainerRef = useRef<HTMLDivElement>(null);
  const [collapsedLists, setCollapsedLists] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return {};
      try {
        const raw = localStorage.getItem("ozzy_collapsed_lists");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
  );

  const handleToggleCollapse = useCallback((listId: string) => {
    setCollapsedLists((prev) => {
      const next = { ...prev, [listId]: !prev[listId] };
      if (typeof window !== "undefined") {
        localStorage.setItem("ozzy_collapsed_lists", JSON.stringify(next));
      }
      return next;
    });
  }, []);

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

  const { boards } = useBoards(resolvedWorkspaceId || "");
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
  const { addCard } = useCards("", resolvedBoardId || "");
  const { moveCard } = useCardMove(resolvedBoardId);
  const { moveList } = useListMove();
  const queryClient = useQueryClient();
  const [openDashcardModal, setOpenDashcardModal] = useState<boolean>(false);
  const [dashcardConfig, setDashcardConfig] = useState<DashcardConfig>();
  const selectedBoard = useSelector(selectCurrentBoard);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const { canCreate } = usePermissions();
  const { addRecentlyViewedBoard } = useRecentlyViewed();

  // Label filter state with localStorage persistence
  const getFilterStorageKey = useCallback((workspaceId: string, boardId: string) => {
    return `ozzy_filters_${workspaceId}_${boardId}`;
  }, []);

  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const key = getFilterStorageKey(resolvedWorkspaceId, resolvedBoardId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const filters = JSON.parse(raw);
        return filters.labelIds || [];
      }
    } catch {
      return [];
    }
    return [];
  });

  // Save filters to localStorage when they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getFilterStorageKey(resolvedWorkspaceId, resolvedBoardId);
    const filters = { labelIds: selectedLabelIds };
    localStorage.setItem(key, JSON.stringify(filters));
  }, [selectedLabelIds, resolvedWorkspaceId, resolvedBoardId, getFilterStorageKey]);

  // Load filters when board changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getFilterStorageKey(resolvedWorkspaceId, resolvedBoardId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const filters = JSON.parse(raw);
        setSelectedLabelIds(filters.labelIds || []);
      } else {
        setSelectedLabelIds([]);
      }
    } catch {
      setSelectedLabelIds([]);
    }
  }, [resolvedBoardId, resolvedWorkspaceId, getFilterStorageKey]);

  useEffect(() => {
    if (!resolvedBoardId || !boards?.length) return;
    const boardMatch = boards.find((board) => board.id === resolvedBoardId);
    if (boardMatch && boardMatch.id !== selectedBoard?.id) {
      dispatch(setCurrentBoard(boardMatch));
    }
  }, [resolvedBoardId, boards, selectedBoard?.id, dispatch]);

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

  // Edge auto-scroll state while dragging cards near horizontal edges
  const dragTypeRef = useRef<"card" | "list" | null>(null);
  const edgeScrollRafRef = useRef<number | null>(null);
  const edgeScrollVelocityRef = useRef(0);
  // Last known pointer position — used to re-sync @hello-pangea/dnd after programmatic scroll
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Local state for instant drag-and-drop (like checklist)
  // This is the source of truth for card positions in the UI
  const [localCards, setLocalCards] = useState<Record<string, Card[]>>({});
  const [localCardsInitialized, setLocalCardsInitialized] = useState(false);
  const [cardsPagination, setCardsPagination] = useState<Record<string, {
    currentPage: number;
    hasMore: boolean;
    totalCards: number;
  }>>({});
  const lastViewedBoardIdRef = useRef<string | null>(null);
  const [loadingMoreByListId, setLoadingMoreByListId] = useState<Record<string, boolean>>({});
  const [loadMoreErrors, setLoadMoreErrors] = useState<Record<string, string | null>>({});
  const [addingCardByListId, setAddingCardByListId] = useState<Record<string, boolean>>({});

  // Initialize local cards from React Query cache on mount
  useEffect(() => {
    if (!lists || lists.length === 0 || !resolvedBoardId) return;

    let cancelled = false;

    const initializeLocalCards = async () => {
      setLocalCardsInitialized(false);
      const initialCards: Record<string, Card[]> = {};
      const initialPagination: Record<string, any> = {};
      const cachedListIdsToRefresh: string[] = [];
      const labelIds = selectedLabelIds.length > 0 ? selectedLabelIds : undefined;
      const hasLabelFilter = !!labelIds;
      const limit = CARD_PAGE_SIZE;

      await Promise.all(
        lists.map(async (list) => {
          // Only use cache when there's NO label filter active
          // When filtering, we must always fetch fresh filtered data from the API
          if (!hasLabelFilter) {
            const cachedCards = queryClient.getQueryData<ApiResponse<Card[]>>(
              queryKeys.cards.list(list.id)
            );

            if (cachedCards?.data) {
              initialCards[list.id] = cachedCards.data;
              initialPagination[list.id] = buildCardsPagination(
                cachedCards.data.length,
                cachedCards.paginate?.totalData,
                1
              );
              cachedListIdsToRefresh.push(list.id);
              return;
            }
          }

          try {
            const response = await cards(
              list.id,
              resolvedBoardId,
              1,
              limit,
              labelIds,
              undefined,
              undefined
            );

            if (response?.data) {
              initialCards[list.id] = response.data;
              initialPagination[list.id] = buildCardsPagination(
                response.data.length,
                response.paginate?.totalData,
                1
              );

              // Keep cards.list cache reserved for the default (unfiltered) list view.
              // Filtered results are local-only to avoid total/count cache collisions.
              if (!hasLabelFilter) {
                queryClient.setQueryData<ApiResponse<Card[]>>(
                  queryKeys.cards.list(list.id),
                  response
                );
              }
            } else {
              initialCards[list.id] = [];
              initialPagination[list.id] = buildCardsPagination(0, 0, 1);
            }
          } catch (error) {
            console.error("[INIT CARDS] Error:", error);
            initialCards[list.id] = [];
            initialPagination[list.id] = buildCardsPagination(0, 0, 1);
          }
        })
      );

      if (cancelled) return;

      setLocalCards(initialCards);
      setCardsPagination(initialPagination);
      setLocalCardsInitialized(true);

      if (!hasLabelFilter && cachedListIdsToRefresh.length > 0) {
        void Promise.allSettled(
          cachedListIdsToRefresh.map(async (listId) => {
            const response = await cards(
              listId,
              resolvedBoardId,
              1,
              limit,
              undefined,
              undefined,
              undefined
            );

            if (cancelled || !response?.data) return;
            const freshCards = response.data;

            queryClient.setQueryData<ApiResponse<Card[]>>(
              queryKeys.cards.list(listId),
              response
            );

            setLocalCards((prev) => {
              const currentCards = prev[listId] || [];
              if (areListCardsEqual(currentCards, freshCards)) {
                return prev;
              }

              return {
                ...prev,
                [listId]: freshCards,
              };
            });

            setCardsPagination((prev) => ({
              ...prev,
              [listId]: buildCardsPagination(
                freshCards.length,
                response.paginate?.totalData,
                1,
                prev[listId]
              ),
            }));
          })
        );
      }
    };

    initializeLocalCards();

    return () => {
      cancelled = true;
    };
  }, [lists, queryClient, resolvedBoardId, selectedLabelIds]);

  // Sync local cards when list cache updates (e.g., automation-driven changes)
  useEffect(() => {
    if (!localCardsInitialized) return;
    if (selectedLabelIds.length > 0) return;

    const cache = queryClient.getQueryCache();
    const unsubscribe = cache.subscribe((event) => {
      if (event?.type !== "updated" || !event.query) return;
      const key = event.query.queryKey;
      if (!Array.isArray(key) || key[0] !== "cards" || key[1] !== "list") {
        return;
      }

      const listId = key[2] as string | undefined;
      if (!listId) return;
      if (lists && !lists.some((list) => list.id === listId)) return;
      if ((window as any).__DRAG_IN_PROGRESS__) return;

      const data = queryClient.getQueryData<ApiResponse<Card[]>>(key);
      if (!data?.data) return;

      const cards = data.data; // Extract to ensure type safety

      setLocalCards((prev): Record<string, Card[]> => {
        const current = prev[listId] || [];
        const next = cards;
        const isSame = areListCardsEqual(current, next);

        if (isSame) {
          console.log(`✅ [SYNC] No changes detected for list ${listId}`);
          return prev;
        }

        console.log(`🔄 [SYNC] Updating local state for list ${listId} - card data changed!`);
        return { ...prev, [listId]: next };
      });

      setCardsPagination((prev) => {
        const previous = prev[listId];

        return {
          ...prev,
          [listId]: {
            ...buildCardsPagination(
              cards.length,
              data.paginate?.totalData,
              previous?.currentPage || 1,
              previous
            ),
            currentPage: previous?.currentPage || 1,
          },
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, localCardsInitialized, lists, selectedLabelIds]);

  // Prefetch ALL dashcard counts in a single batch request at the board level.
  // This ensures all dashcard counts arrive together and are cached before
  // individual Dashcard components mount (which happens lazily per list).
  usePrefetchDashcardCounts(localCards, resolvedWorkspaceId, localCardsInitialized);

  // Render lists once local cards are initialized
  const shouldRenderLists =
    !isLoading &&
    Array.isArray(lists) &&
    lists.length >= 0 &&
    (localCardsInitialized || lists.length === 0);

  // Update Redux state when board details are fetched (same pattern as sidebar)
  useEffect(() => {
    if (!boardDetails) return;

    dispatch(setCurrentBoard(boardDetails));

    if (boardDetails.id !== lastViewedBoardIdRef.current) {
      addRecentlyViewedBoard({
        id: boardDetails.id,
        name: boardDetails.name || "Untitled Board",
        workspaceId: resolvedWorkspaceId,
        workspaceName: currentWorkspace?.name || "Untitled Workspace",
      });
      lastViewedBoardIdRef.current = boardDetails.id;
    }
  }, [
    boardDetails,
    dispatch,
    addRecentlyViewedBoard,
    resolvedWorkspaceId,
    currentWorkspace?.name,
  ]);

  const stopEdgeAutoScroll = useCallback(() => {
    // Only zero out velocity — do NOT cancel the RAF loop.
    // Cancelling it would kill the loop permanently for subsequent drags.
    edgeScrollVelocityRef.current = 0;
  }, []);

  const updateEdgeScrollVelocity = useCallback((clientX: number) => {
    if (dragTypeRef.current !== "card") {
      edgeScrollVelocityRef.current = 0;
      return;
    }

    const container = boardScrollContainerRef.current;
    if (!container) {
      edgeScrollVelocityRef.current = 0;
      return;
    }

    const rect = container.getBoundingClientRect();
    const EDGE_THRESHOLD = 140;
    const MAX_SPEED = 28;
    let velocity = 0;

    if (clientX < rect.left + EDGE_THRESHOLD) {
      const ratio = (rect.left + EDGE_THRESHOLD - clientX) / EDGE_THRESHOLD;
      velocity = -Math.min(MAX_SPEED, Math.max(0, ratio * MAX_SPEED));
    } else if (clientX > rect.right - EDGE_THRESHOLD) {
      const ratio = (clientX - (rect.right - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
      velocity = Math.min(MAX_SPEED, Math.max(0, ratio * MAX_SPEED));
    }

    edgeScrollVelocityRef.current = velocity;
  }, []);

  useEffect(() => {
    // Use pointermove instead of mousemove — when @hello-pangea/dnd calls setPointerCapture()
    // on the drag handle, browsers may suppress compatibility mousemove events. Pointermove
    // events still bubble up to document even with pointer capture active.
    // Guard against synthetic events we dispatch ourselves (from the RAF tick below).
    const onPointerMove = (event: PointerEvent) => {
      if (!event.isTrusted) return;
      lastPointerPosRef.current = { x: event.clientX, y: event.clientY };
      updateEdgeScrollVelocity(event.clientX);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!event.touches || event.touches.length === 0) return;
      lastPointerPosRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      updateEdgeScrollVelocity(event.touches[0].clientX);
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [updateEdgeScrollVelocity]);

  useEffect(() => {
    let mousemoveRafId: number | null = null;

    const tick = () => {
      const container = boardScrollContainerRef.current;
      const velocity = edgeScrollVelocityRef.current;

      if (
        container &&
        dragTypeRef.current === "card" &&
        (window as any).__DRAG_IN_PROGRESS__ &&
        velocity !== 0
      ) {
        container.scrollLeft += velocity;

        // After programmatic scroll, @hello-pangea/dnd receives the scroll event
        // and updates its position cache via RAF-throttled scheduleScrollUpdate.
        // We must wait for that RAF to execute BEFORE dispatching the synthetic
        // mousemove, otherwise the library processes the mousemove with stale
        // droppable positions. Using a nested RAF ensures our mousemove fires
        // in the NEXT frame, after the library has processed the scroll update.
        if (mousemoveRafId !== null) cancelAnimationFrame(mousemoveRafId);
        mousemoveRafId = requestAnimationFrame(() => {
          window.dispatchEvent(
            new MouseEvent("mousemove", {
              clientX: lastPointerPosRef.current.x,
              clientY: lastPointerPosRef.current.y,
              bubbles: true,
              cancelable: true,
            })
          );
        });
      }

      edgeScrollRafRef.current = requestAnimationFrame(tick);
    };

    edgeScrollRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (edgeScrollRafRef.current !== null) {
        cancelAnimationFrame(edgeScrollRafRef.current);
      }
      if (mousemoveRafId !== null) {
        cancelAnimationFrame(mousemoveRafId);
      }
    };
  }, []);

  const onListDragEnd = (result: DropResult) => {
      const { destination: rawDestination, source, type, draggableId } = result;

      // For card drops: ALWAYS use DOM-based detection to find the real droppable.
      // @hello-pangea/dnd tracks scroll on the card area droppable (overflow-y:auto)
      // but NOT on the board's horizontal scroll container. After programmatic
      // horizontal scroll, the library's position cache is completely stale —
      // rawDestination may point to the wrong list, or even be null (if the stale
      // cache can't match the pointer to any droppable).
      let destination = rawDestination;
      if (
        type === "card" &&
        (!rawDestination || rawDestination.droppableId !== source.droppableId)
      ) {
        const pointer = lastPointerPosRef.current;
        const droppables = document.querySelectorAll<HTMLElement>(
          '[data-rbd-droppable-id^="droppable-card-area-"]'
        );

        let correctDroppableId: string | null = null;
        let closestDistSq = Infinity;

        for (let d = 0; d < droppables.length; d++) {
          const el = droppables[d];
          const rect = el.getBoundingClientRect();
          if (
            pointer.x >= rect.left &&
            pointer.x <= rect.right &&
            pointer.y >= rect.top &&
            pointer.y <= rect.bottom
          ) {
            correctDroppableId = el.getAttribute("data-rbd-droppable-id");
            break;
          }
          // Track closest droppable in case pointer is between lists or near edge
          const clampedX = Math.max(rect.left, Math.min(pointer.x, rect.right));
          const clampedY = Math.max(rect.top, Math.min(pointer.y, rect.bottom));
          const dx = pointer.x - clampedX;
          const dy = pointer.y - clampedY;
          const distSq = dx * dx + dy * dy;
          if (distSq < closestDistSq) {
            closestDistSq = distSq;
            correctDroppableId = el.getAttribute("data-rbd-droppable-id");
          }
        }

        if (correctDroppableId) {
          // Compute the correct index inside the target list based on pointer Y position
          let correctIndex = 0;
          const targetEl = document.querySelector<HTMLElement>(
            `[data-rbd-droppable-id="${correctDroppableId}"]`
          );
          if (targetEl) {
            const draggables = targetEl.querySelectorAll<HTMLElement>(
              "[data-rbd-draggable-id]"
            );
            let insertAt = draggables.length; // default: append at end
            for (let i = 0; i < draggables.length; i++) {
              const rect = draggables[i].getBoundingClientRect();
              if (pointer.y < rect.top + rect.height / 2) {
                insertAt = i;
                break;
              }
            }
            correctIndex = insertAt;
          }

          const domDestination = { droppableId: correctDroppableId, index: correctIndex };

          if (!rawDestination) {
            console.log(
              `[DnD] Library reported null destination, DOM correction found: ${correctDroppableId}`
            );
            destination = domDestination;
          } else if (correctDroppableId !== rawDestination.droppableId) {
            console.log(
              `[DnD] Correcting destination: ${rawDestination.droppableId} → ${correctDroppableId}`
            );
            destination = domDestination;
          }
        }
      }

      // Drop outside any droppable area (and DOM correction didn't find one either)
      if (!destination) {
        if (type === "card" || type === "list") {
          if (type === "card") {
            currentDragState.current = null;
          }
          dragTypeRef.current = null;
          stopEdgeAutoScroll();
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
        if (type === "card" || type === "list") {
          if (type === "card") {
            currentDragState.current = null;
          }
          dragTypeRef.current = null;
          stopEdgeAutoScroll();
          document.body.classList.remove("dragging");
          (window as any).__DRAG_IN_PROGRESS__ = false;
        }
        return;
      }

      dragTypeRef.current = null;
      stopEdgeAutoScroll();

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
    };

  const onDragStart = (start: any): void => {
    // Simple drag start - just add dragging class for CSS transitions
    if (start.type === "card" || start.type === "list") {
      dragTypeRef.current = start.type;
      document.body.classList.add("dragging");
      (window as any).__DRAG_IN_PROGRESS__ = true;
    }

    // Initialize drag state tracking for cards
    if (start.type === "card") {
      const sourceListId = start.source.droppableId?.replaceAll(
        "droppable-card-area-",
        ""
      );
      const sourceCards = sourceListId ? localCards[sourceListId] || [] : [];
      let originalCard = sourceCards.find((c) => c.id === start.draggableId);
      if (!originalCard && sourceListId) {
        const cachedCards = queryClient.getQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(sourceListId)
        );
        originalCard = cachedCards?.data?.find(
          (c) => c.id === start.draggableId
        );
      }

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
    dragTypeRef.current = null;
    stopEdgeAutoScroll();
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

  // Helper to move card between lists (like checklist reorder)
  const moveCardBetweenLists = useCallback((
    sourceListId: string,
    destListId: string,
    sourceIndex: number,
    destIndex: number,
    cardId: string
  ): Record<string, Card[]> => {
    const newLocalCards = { ...localCards };

    // Find card to move
    const sourceCards = [...(newLocalCards[sourceListId] || [])];
    const [movedCard] = sourceCards.splice(sourceIndex, 1);

    if (!movedCard) return newLocalCards;

    // Update card's listId
    const updatedCard = { ...movedCard, listId: destListId };

    if (sourceListId === destListId) {
      sourceCards.splice(destIndex, 0, updatedCard);
      newLocalCards[sourceListId] = sourceCards;
      return newLocalCards;
    }

    // Add to destination
    const destCards = [...(newLocalCards[destListId] || [])];
    destCards.splice(destIndex, 0, updatedCard);

    // Update state
    newLocalCards[sourceListId] = sourceCards;
    newLocalCards[destListId] = destCards;

    return newLocalCards;
  }, [localCards]);

  const handleCardDragEnd = (
    sourceList: string,
    sourceIndex: number,
    destList: string,
    destIndex: number,
    cardId: string
  ): void => {
    const sourceListId = sourceList?.replaceAll("droppable-card-area-", "");
    const destListId = destList?.replaceAll("droppable-card-area-", "");

    const originalPosition = currentDragState.current?.originalPosition;
    const originalListId = currentDragState.current?.originalListId;
    const originalCard = currentDragState.current?.originalCard;

    const actualMove =
      currentDragState.current &&
      originalPosition !== undefined &&
      originalListId &&
      (destListId !== originalListId ||
        (destListId === originalListId && destIndex !== originalPosition));

    console.log('🎯 [DRAG END] Drag ended', {
      cardId,
      from: originalListId,
      to: destListId,
      actualMove,
    });

    (window as any).__DRAG_IN_PROGRESS__ = true;
    dragTypeRef.current = null;
    stopEdgeAutoScroll();
    currentDragState.current = null;

    if (actualMove && originalCard && originalListId && destListId) {
      console.log('🚀 [DRAG END] Updating LOCAL STATE synchronously');

      // Store previous state for rollback
      const previousLocalCards = { ...localCards };
      const previousPagination = { ...cardsPagination };

      // Update local state SYNCHRONOUSLY (instant!)
      const newLocalCards = moveCardBetweenLists(
        originalListId,
        destListId,
        originalPosition,
        destIndex,
        cardId
      );
      setLocalCards(newLocalCards);

      if (originalListId !== destListId) {
        setCardsPagination((prev) => ({
          ...prev,
          [originalListId]: {
            ...(prev[originalListId] || {
              currentPage: 1,
              hasMore: false,
              totalCards: 0,
            }),
            totalCards: Math.max(0, (prev[originalListId]?.totalCards || 0) - 1),
          },
          [destListId]: {
            ...(prev[destListId] || {
              currentPage: 1,
              hasMore: false,
              totalCards: 0,
            }),
            totalCards: (prev[destListId]?.totalCards || 0) + 1,
          },
        }));
      }

      console.log('✅ [DRAG END] Local state updated - INSTANT!');

      const refreshFilteredList = async (listId: string) => {
        if (!resolvedBoardId) return;

        const response = await cards(
          listId,
          resolvedBoardId,
          1,
          CARD_PAGE_SIZE,
          selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
          undefined,
          undefined
        );

        const nextCards = response?.data || [];

        setLocalCards((prev) => ({
          ...prev,
          [listId]: nextCards,
        }));

        setCardsPagination((prev) => ({
          ...prev,
          [listId]: buildCardsPagination(
            nextCards.length,
            response?.paginate?.totalData,
            1,
            prev[listId]
          ),
        }));
      };

      // Fire mutation in background
      console.log('🔄 [DRAG END] Firing mutation for persistence');
      moveCard(
        {
          cardId: cardId,
          previousListId: originalListId,
          targetListId: destListId,
          previousPosition: originalPosition,
          targetPosition: destIndex,
        },
        {
          onSuccess: () => {
            if (selectedLabelIds.length > 0) {
              const affectedListIds = Array.from(
                new Set([originalListId, destListId])
              );

              void Promise.allSettled(
                affectedListIds.map((listId) => refreshFilteredList(listId))
              );
            }

            console.log('✅ [DRAG END] Mutation success - clearing drag flag for sync');
            // Clear drag flag BEFORE onSettled invalidates queries
            // This allows the sync effect to pick up the refetched data with updated labels/CFs
            (window as any).__DRAG_IN_PROGRESS__ = false;
            document.body.classList.remove("dragging");
          },
          onError: () => {
            console.error('❌ [DRAG END] Mutation failed - rolling back');
            setLocalCards(previousLocalCards);
            setCardsPagination(previousPagination);
            (window as any).__DRAG_IN_PROGRESS__ = false;
            document.body.classList.remove("dragging");
          },
        }
      );
    } else {
      (window as any).__DRAG_IN_PROGRESS__ = false;
      document.body.classList.remove("dragging");
    }
  };

  const loadMoreCards = useCallback(async (listId: string) => {
    if (!resolvedBoardId) return;
    const pagination = cardsPagination[listId];
    if (!pagination || !pagination.hasMore) return;
    if (loadingMoreByListId[listId]) return;

    const nextPage = pagination.currentPage + 1;

    setLoadingMoreByListId((prev) => ({ ...prev, [listId]: true }));
    setLoadMoreErrors((prev) => ({ ...prev, [listId]: null }));

    try {
      const response = await cards(
        listId,
        resolvedBoardId,
        nextPage,
        CARD_PAGE_SIZE,
        selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
        undefined,
        undefined
      );

      if (response.data && response.data.length > 0) {
        const newCards = response.data; // Extract for type safety
        const hasLabelFilter = selectedLabelIds.length > 0;

        setLocalCards((prev) => {
          const existing = prev[listId] || [];
          const byId = new Map<string, Card>();
          existing.forEach((card) => byId.set(card.id, card));
          newCards.forEach((card) => byId.set(card.id, card));
          const updatedCards = Array.from(byId.values());

          if (!hasLabelFilter) {
            queryClient.setQueryData<ApiResponse<Card[]>>(
              queryKeys.cards.list(listId),
              {
                ...response,
                data: updatedCards,
              }
            );
          }

          const totalCards = response.paginate?.totalData || 0;
          const hasMoreByTotal =
            totalCards > 0
              ? updatedCards.length < totalCards
              : newCards.length >= CARD_PAGE_SIZE;

          setCardsPagination((prevPagination) => ({
            ...prevPagination,
            [listId]: {
              currentPage: nextPage,
              hasMore: hasMoreByTotal,
              totalCards:
                totalCards ||
                prevPagination[listId]?.totalCards ||
                updatedCards.length,
            },
          }));

          return {
            ...prev,
            [listId]: updatedCards,
          };
        });
      } else {
        setCardsPagination((prev) => ({
          ...prev,
          [listId]: {
            ...(prev[listId] || {
              currentPage: 1,
              hasMore: false,
              totalCards: 0,
            }),
            hasMore: false,
          },
        }));
      }
    } catch (error) {
      console.error("[LOAD MORE] Error:", error);
      setLoadMoreErrors((prev) => ({
        ...prev,
        [listId]: "Failed to load more cards. Please try again.",
      }));
    } finally {
      setLoadingMoreByListId((prev) => ({ ...prev, [listId]: false }));
    }
  }, [cardsPagination, loadingMoreByListId, queryClient, resolvedBoardId, selectedLabelIds]);

  const retryLoadMoreCards = useCallback((listId: string) => {
    setLoadMoreErrors((prev) => ({ ...prev, [listId]: null }));
    loadMoreCards(listId);
  }, [loadMoreCards]);

  const handleAddCard = useCallback(
    ({ card, listId }: { card: Partial<Card>; listId: string }) => {
      if (!listId) return;

      const tempId = `temp-card-${Date.now()}`;
      const tempCard: Card = {
        ...card,
        id: tempId,
        createdAt: new Date().toISOString(),
        listId,
      } as Card;

      setAddingCardByListId((prev) => ({ ...prev, [listId]: true }));
      setLocalCards((prev) => ({
        ...prev,
        [listId]: [tempCard, ...(prev[listId] || [])],
      }));
      setCardsPagination((prev) => ({
        ...prev,
        [listId]: {
          currentPage: prev[listId]?.currentPage || 1,
          hasMore: prev[listId]?.hasMore || false,
          totalCards: (prev[listId]?.totalCards || 0) + 1,
        },
      }));

      addCard(
        { card, listId },
        {
          onSuccess: (response) => {
            const realCard = response.data;
            setLocalCards((prev) => ({
              ...prev,
              [listId]: (prev[listId] || []).map((c) =>
                c.id === tempId ? realCard : c
              ),
            }));
          },
          onError: () => {
            setLocalCards((prev) => ({
              ...prev,
              [listId]: (prev[listId] || []).filter((c) => c.id !== tempId),
            }));
            setCardsPagination((prev) => ({
              ...prev,
              [listId]: {
                ...(prev[listId] || {
                  currentPage: 1,
                  hasMore: false,
                  totalCards: 0,
                }),
                totalCards: Math.max(0, (prev[listId]?.totalCards || 0) - 1),
              },
            }));
          },
          onSettled: () => {
            setAddingCardByListId((prev) => ({ ...prev, [listId]: false }));
          },
        }
      );
    },
    [addCard]
  );

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

      handleAddCard({ card, listId });
    }
  };

  return (
    <div
      className="h-auto min-h-[600px] mr-4 pt-[50px]"
      style={{
        width: collapsed
          ? `calc(100%-${siderSmall})`
          : `calc(100%-${siderWide})`,
        // Background is now applied at the body level for full-page effect
      }}
    >
      <BoardPermissionsProvider board={boardDetails}>
        <BoardTopbar
          boardScopeMenuOpen={boardScopeMenu}
          setBoardScopeMenuOpen={setBoardScopeMenu}
          openDashcardModal={openDashcardModal}
          setOpenDashcardModal={setOpenDashcardModal}
          board={boardDetails}
          selectedLabelIds={selectedLabelIds}
          onLabelFilterChange={setSelectedLabelIds}
        />
        <CardFocusProvider>
          <CardDetailProvider>
            <div className="relative pb-10">
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
                collapsedLists={collapsedLists}
                onToggleCollapse={handleToggleCollapse}
                localCards={localCards}
                cardsPagination={cardsPagination}
                loadingMoreByListId={loadingMoreByListId}
                loadMoreErrors={loadMoreErrors}
                addingCardByListId={addingCardByListId}
                onLoadMoreCards={loadMoreCards}
                onRetryLoadMoreCards={retryLoadMoreCards}
                onAddCard={handleAddCard}
              />
              <HorizontalSlider
                containerRef={boardScrollContainerRef}
                widthPercent={20}
              />
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

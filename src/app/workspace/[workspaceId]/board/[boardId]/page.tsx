"use client";

import dynamic from "next/dynamic";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import BoardTopbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { useListMove, useLists } from "@hooks/list";
import { useParams } from "next/navigation";
import { generateId } from "@utils/general";
// import { Droppable, DropResult, DragUpdate } from "@hello-pangea/dnd";
import List from "./draggable-list";
import { Button, Input, Spin } from "antd";
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
import { cards, mapBackendCardToFrontend } from "@api/card";
import { boardFull } from "@api/board";
import { DashcardCounts, useBoardFullStore } from "@store/board-full-store";
import { useDashcardCountStore } from "@store/dashcard-count-store";

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
  boardReady: boolean;
  cardsFetchEnabled: boolean;
  cardPrefetchError?: string | null;
  onListCardsHydrated?: (listId: string) => void;
  compactMode: boolean;
  visibleListsCount: number;
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
  compactMode,
  visibleListsCount,
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
  cardPrefetchError,
  boardReady,
  cardsFetchEnabled,
  onListCardsHydrated,
}) => {
    const containerOverflowClass = boardReady ? "overflow-x-auto" : "overflow-hidden";
    // Now we can safely use the context hook inside the provider
    const { canCreateList } = useBoardPermissionsContext();
    const [boardRect, setBoardRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
      const element = boardScrollContainerRef.current;
      if (!element) {
        setBoardRect(null);
        return;
      }

      const updateRect = () => {
        const rect = boardScrollContainerRef.current?.getBoundingClientRect();
        setBoardRect(rect ?? null);
      };

      updateRect();

      const handleWindowEvent = () => updateRect();
      window.addEventListener("resize", handleWindowEvent);
      window.addEventListener("scroll", handleWindowEvent, true);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updateRect);
        resizeObserver.observe(element);
      }

      return () => {
        window.removeEventListener("resize", handleWindowEvent);
        window.removeEventListener("scroll", handleWindowEvent, true);
        resizeObserver?.disconnect();
      };
    }, [boardScrollContainerRef]);

    return (
      <div
        ref={boardScrollContainerRef}
        className={`relative h-auto min-h-[770px] w-full ${containerOverflowClass} overflow-y-hidden custom-horizontal-scrollbar board-scroll-container ${isDraggingToScroll ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!boardReady && (
          <div
            className="z-40 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/40 text-white backdrop-blur-sm"
            style={
              boardRect
                ? {
                  position: "fixed",
                  top: boardRect.top,
                  left: boardRect.left,
                  width: boardRect.width,
                  height: boardRect.height,
                }
                : {
                  position: "absolute",
                  inset: 0,
                }
            }
          >
            <Spin size="large" className="text-white" />
            <p className="text-center text-sm font-medium">
              Loading all lists and cards…
            </p>
          </div>
        )}
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
                    {(lists || [])
                      .slice(
                        0,
                        compactMode
                          ? Math.min(visibleListsCount, lists?.length || 0)
                          : lists?.length || 0
                      )
                      .map((list: AnyList, index: number) => {
                        return (
                          <List
                            key={list.id}
                            list={list}
                            index={index}
                            boardId={resolvedBoardId}
                            updateList={updateList}
                            deleteList={deleteList}
                            prefetchReady={cardsFetchEnabled}
                            compactMode={compactMode}
                            onCardsHydrated={onListCardsHydrated}
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

        {!shouldRenderLists && (
          <div>
            {cardPrefetchError && (
              <div className="px-4 text-sm text-red-600 text-center mb-4">
                {cardPrefetchError}
              </div>
            )}
            <ListSkeleton />
          </div>
        )}
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
  const listIds = useMemo(
    () => (lists ? lists.map((list) => list.id) : []),
    [lists]
  );
  const [areAllCardsFetched, setAreAllCardsFetched] = useState(false);
  const [cardPrefetchError, setCardPrefetchError] = useState<string | null>(null);
  const initialBoardIdRef = useRef<string | null>(null);
  const prefetchedListIdsRef = useRef<string[]>([]);
  const initialPrefetchInProgressRef = useRef(false);
  const [listsHydrated, setListsHydrated] = useState(false);
  const listReadySetRef = useRef<Set<string>>(new Set());
  const [dashcardCountsReady, setDashcardCountsReady] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [visibleListsCount, setVisibleListsCount] = useState<number>(Infinity);
  const [isHydratingFullData, setIsHydratingFullData] = useState(false);

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
  const { addCard } = useCards("", "");
  const queryClient = useQueryClient();
  const refetchBoardData = useCallback(() => {
    if (!resolvedBoardId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.withLists(resolvedBoardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(resolvedBoardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.lists.board(resolvedBoardId) });
    queryClient.invalidateQueries({ queryKey: ["lists", resolvedBoardId] });
  }, [queryClient, resolvedBoardId]);
  const { moveCard } = useCardMove(resolvedBoardId, { onSettled: refetchBoardData });
  const { moveList } = useListMove();
  const [openDashcardModal, setOpenDashcardModal] = useState<boolean>(false);
  const [dashcardConfig, setDashcardConfig] = useState<DashcardConfig>();
  const selectedBoard = useSelector(selectCurrentBoard);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const { canCreate } = usePermissions();
  const { addRecentlyViewedBoard } = useRecentlyViewed();
  const setBoardFullStore = useBoardFullStore((state) => state.setBoardFull);
  const setDashcardCounts = useDashcardCountStore((state) => state.setCounts);

  // Enable real-time updates via WebSocket
  useRealtimeUpdates();

  // Hydrate all lists, cards, and dashcard counts with a single payload
  useEffect(() => {
    if (!resolvedBoardId || !resolvedWorkspaceId) return;

    let isActive = true;
    setIsHydratingFullData(true);
    setCardPrefetchError(null);

    boardFull(resolvedBoardId, resolvedWorkspaceId)
      .then((resp) => {
        if (!isActive) return;
        const payload = (resp as any)?.data?.data || (resp as any)?.data;
        if (!payload) return;

        setCompactMode(!!payload.meta?.isLargeBoard);
        setVisibleListsCount(
          payload.meta?.isLargeBoard
            ? Math.min(6, (payload.lists || []).length)
            : (payload.lists || []).length
        );

        const listsFromPayload = payload.lists || [];
        const normalizedLists = listsFromPayload.map((list: any) => ({
          ...list,
          position:
            (list as any).position ??
            (list as any).order ??
            (list as any).order_index ??
            0,
        }));

        if (resolvedWorkspaceId && payload.dashcardCounts) {
          setDashcardCounts(
            resolvedWorkspaceId,
            payload.dashcardCounts || {}
          );
        }

        if (resolvedBoardId && resolvedWorkspaceId) {
          console.log(payload, '<< ini isi payload')
          const normalizedDashcardCounts: DashcardCounts = Object.fromEntries(
            Object.entries(payload.dashcardCounts ?? {}).map(
              ([id, count]): [string, number] => [
                id.toLowerCase().replace(/-/g, ""),
                Number(count), // enforce number
              ]
            )
          );

          setBoardFullStore(resolvedBoardId, resolvedWorkspaceId, {
            board: payload.board,
            lists: normalizedLists,
            dashcardCounts: normalizedDashcardCounts || {},
            meta: payload.meta,
          });
        }

        // Seed lists cache
        queryClient.setQueryData(["lists", resolvedBoardId], {
          status_code: 200,
          message: "Success",
          data: normalizedLists,
        });

        // Seed cards per list
        const listIdsFromPayload = normalizedLists.map((l: any) => l.id);
        prefetchedListIdsRef.current = listIdsFromPayload;
        listReadySetRef.current = new Set(listIdsFromPayload);

        normalizedLists.forEach((list: any) => {
          const cardsRaw = list.cards || [];
          const mappedCards = cardsRaw.map((card: any) => {
            const withDashCount = {
              ...card,
              dashcardCount: payload.dashcardCounts?.[card.id],
            };
            return mapBackendCardToFrontend(withDashCount);
          });
          queryClient.setQueryData(queryKeys.cards.list(list.id), {
            status_code: 200,
            message: "Success",
            data: mappedCards,
            paginate: {
              totalData:
                list.cards_paginate?.total_data ??
                list.cards_total ??
                mappedCards.length,
              page: list.cards_paginate?.page ?? 1,
              limit: list.cards_paginate?.limit ?? mappedCards.length,
              totalPage:
                list.cards_paginate?.total_page ??
                Math.ceil(
                  (list.cards_total ?? mappedCards.length) /
                  ((list.cards_paginate?.limit ?? mappedCards.length) || 1)
                ),
            },
          });
        });


        initialBoardIdRef.current = resolvedBoardId;
        setAreAllCardsFetched(true);
        setListsHydrated(true);
        const skippedMeta = payload.meta?.skipped;
        const skipDashCounts = skippedMeta?.dashcardCounts === true;
        setDashcardCountsReady(!skipDashCounts);
      })
      .catch((error) => {
        console.error("Failed to hydrate board data", error);
        if (!isActive) return;
        setCardPrefetchError("Unable to load board data. Please try again.");
      })
      .finally(() => {
        if (!isActive) return;
        setIsHydratingFullData(false);
      });

    return () => {
      isActive = false;
    };
  }, [resolvedBoardId, resolvedWorkspaceId, queryClient]);

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
  const cardsFetchEnabled = areAllCardsFetched;
  const boardReady =
    areAllCardsFetched && listsHydrated && dashcardCountsReady;
  const shouldRenderLists =
    !isLoading &&
    Array.isArray(lists) &&
    lists.length >= 0 &&
    areAllCardsFetched;

  // Gradually reveal lists in compact mode to avoid blocking the main thread
  useEffect(() => {
    if (!compactMode) {
      setVisibleListsCount(lists?.length || 0);
      return;
    }
    if (!lists || lists.length === 0) return;

    let cancelled = false;
    const step = 4;
    const tick = () => {
      setVisibleListsCount((prev) => {
        const next = Math.min(prev + step, lists.length);
        return next;
      });
      if (!cancelled && visibleListsCount < lists.length) {
        setTimeout(tick, 30);
      }
    };

    // start progression shortly after mount
    setTimeout(tick, 50);

    return () => {
      cancelled = true;
    };
  }, [compactMode, lists?.length, lists]);

  const handleListHydrated = useCallback(
    (listId: string) => {
      if (listReadySetRef.current.has(listId)) return;
      listReadySetRef.current.add(listId);
      if (listReadySetRef.current.size >= listIds.length) {
        setListsHydrated(true);
      }
    },
    [listIds.length]
  );

  useEffect(() => {
    if (!resolvedBoardId || isLoading || !lists || isHydratingFullData) return;

    if (initialBoardIdRef.current === resolvedBoardId && areAllCardsFetched) {
      return;
    }

    if (listIds.length === 0) {
      initialBoardIdRef.current = resolvedBoardId;
      prefetchedListIdsRef.current = [];
      listReadySetRef.current.clear();
      setAreAllCardsFetched(true);
      setListsHydrated(true);
      setCardPrefetchError(null);
      return;
    }

    if (initialPrefetchInProgressRef.current) {
      return;
    }

    const PREFETCH_BATCH_SIZE = 3;
    let isActive = true;
    initialPrefetchInProgressRef.current = true;
    prefetchedListIdsRef.current = [];
    listReadySetRef.current.clear();
    setAreAllCardsFetched(false);
    setListsHydrated(false);
    setCardPrefetchError(null);

    const runPrefetch = async () => {
      let encounteredError = false;
      for (let i = 0; i < listIds.length && isActive; i += PREFETCH_BATCH_SIZE) {
        const batch = listIds.slice(i, i + PREFETCH_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((listId) =>
            queryClient.prefetchQuery({
              queryKey: queryKeys.cards.list(listId),
              queryFn: () => cards(listId, resolvedBoardId),
            })
          )
        );

        if (results.some((result) => result.status === "rejected")) {
          encounteredError = true;
        }
      }

      if (!isActive) return;

      if (encounteredError) {
        setCardPrefetchError(
          "Unable to load some lists. Please refresh if this persists."
        );
      }

      initialBoardIdRef.current = resolvedBoardId;
      prefetchedListIdsRef.current = listIds;
      setAreAllCardsFetched(true);
    };

    runPrefetch().finally(() => {
      initialPrefetchInProgressRef.current = false;
    });

    return () => {
      isActive = false;
      initialPrefetchInProgressRef.current = false;
    };
  }, [listIds, lists, queryClient, resolvedBoardId, isLoading, areAllCardsFetched]);

  useEffect(() => {
    if (
      !resolvedBoardId ||
      isLoading ||
      !lists ||
      initialBoardIdRef.current !== resolvedBoardId
    ) {
      return;
    }

    const newListIds = listIds.filter(
      (id) => !prefetchedListIdsRef.current.includes(id)
    );

    if (newListIds.length === 0) {
      return;
    }

    newListIds.forEach((listId) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.cards.list(listId),
        queryFn: () => cards(listId, resolvedBoardId),
      });
    });

    prefetchedListIdsRef.current = [
      ...prefetchedListIdsRef.current,
      ...newListIds,
    ];
  }, [listIds, lists, queryClient, resolvedBoardId, isLoading]);

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
      // Helper to update cards cache and keep paginate totals in sync
      const updateCardsCache = (
        listId: string,
        mutate: (cards: Card[]) => Card[],
        deltaTotal: number
      ) => {
        queryClient.setQueryData<ApiResponse<Card[]>>(
          queryKeys.cards.list(listId),
          (old) => {
            const prevData = old?.data ?? [];
            const newData = mutate(prevData);

            const basePaginate = (old as any)?.paginate || {};
            const limit =
              basePaginate.limit ??
              basePaginate.limit ??
              20;
            const page = basePaginate.page ?? 1;
            const prevTotal =
              basePaginate.totalData ??
              basePaginate.total_data ??
              prevData.length;
            const newTotal = Math.max(
              prevTotal + deltaTotal,
              newData.length
            );
            const totalPage = Math.max(
              1,
              Math.ceil(newTotal / (limit || 1))
            );
            const nextPageCandidate =
              basePaginate.nextPage ??
              basePaginate.next_page ??
              (newTotal > newData.length ? page + 1 : null);
            return {
              status_code: old?.status_code ?? 200,
              message: old?.message ?? "Success",
              data: newData,
              paginate: {
                ...basePaginate,
                limit,
                page,
                totalData: newTotal,
                totalPage,
                nextPage: newTotal > newData.length ? nextPageCandidate : null,
                prevPage: page > 1 ? page - 1 : 0,
              },
            };
          }
        );
      };
      // Helper to update list-level totals (cards_total, cards_paginate) used by headers
      const bumpListTotals = (listId: string, delta: number) => {
        if (!resolvedBoardId) return;

        const adjustListMeta = (list: any) => {
          if (!list) return list;
          const limit =
            list.cards_paginate?.limit ??
            list.cardsPaginate?.limit ??
            list.cards_paginate?.limit ??
            20;
          const currentTotal =
            list.cards_paginate?.total_data ??
            list.cards_paginate?.totalData ??
            list.cardsPaginate?.totalData ??
            list.cards_total ??
            0;
          const nextTotal = Math.max(0, (currentTotal as number) + delta);
          const nextTotalPage = Math.max(
            1,
            Math.ceil(nextTotal / (limit || 1))
          );

          return {
            ...list,
            cards_total: nextTotal,
            cards_paginate: {
              ...(list.cards_paginate || list.cardsPaginate || {}),
              total_data: nextTotal,
              totalData: nextTotal,
              total_page: nextTotalPage,
              totalPage: nextTotalPage,
            },
          };
        };

        // lists.board cache
        queryClient.setQueryData(
          ["lists", resolvedBoardId],
          (old: any) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: old.data.map((l: any) =>
                l.id === listId ? adjustListMeta(l) : l
              ),
            };
          }
        );

        // boards.withLists cache
        queryClient.setQueryData(
          queryKeys.boards.withLists(resolvedBoardId),
          (old: any) => {
            if (!old?.data) return old;
            const lists = old.data.lists || old.data?.lists;
            if (!Array.isArray(lists)) return old;
            const nextLists = lists.map((l: any) =>
              l.id === listId ? adjustListMeta(l) : l
            );
            return {
              ...old,
              data: {
                ...old.data,
                lists: nextLists,
              },
            };
          }
        );
      };

      // Handle cross-list moves
      if (destListId !== originalListId) {
        // Remove card from original list
        updateCardsCache(
          originalListId,
          (cards) => cards.filter((c) => c.id !== cardId),
          -1
        );
        bumpListTotals(originalListId, -1);

        // Add card to destination list
        updateCardsCache(
          destListId,
          (cards) => {
            const newCards = [...cards];
            const insertPosition = Math.min(destIndex, newCards.length);
            const updatedCard = { ...originalCard, listId: destListId };
            newCards.splice(insertPosition, 0, updatedCard);
            return newCards;
          },
          1
        );
        bumpListTotals(destListId, 1);
      } else {
        // Handle same-list reordering
        updateCardsCache(
          destListId,
          (cards) => {
            const newCards = [...cards];
            const cardIndex = newCards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) return newCards;
            const [movedCard] = newCards.splice(cardIndex, 1);
            const insertPosition = Math.min(destIndex, newCards.length);
            newCards.splice(insertPosition, 0, movedCard);
            return newCards;
          },
          0
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
                compactMode={compactMode}
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
                boardReady={boardReady}
                cardsFetchEnabled={cardsFetchEnabled}
                onListCardsHydrated={handleListHydrated}
                cardPrefetchError={cardPrefetchError}
                visibleListsCount={visibleListsCount}
              />
              <HorizontalSlider
                containerRef={boardScrollContainerRef}
                widthPercent={20}
                className={
                  boardReady
                    ? ""
                    : "pointer-events-none opacity-0 transition-opacity duration-200"
                }
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

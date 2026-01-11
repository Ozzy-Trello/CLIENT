import { Draggable, Droppable } from "@hello-pangea/dnd";
import ListName from "./list-name";
import { useCardsPaginated } from "@hooks/card";
import DraggableCard from "../draggable-card";
import AddCard from "./add-card";
import { UseMutateFunction, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnyList } from "@myTypes/list";
import { usePermissions } from "@hooks/account";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useParams } from "next/navigation";

interface DraggableListProps {
  list: AnyList;
  index: number;
  boardId: string;
  updateList: UseMutateFunction<
    any,
    Error,
    { listId: string; updates: Partial<AnyList> },
    unknown
  >;
  deleteList: UseMutateFunction<any, Error, { listId: string }, unknown>;
  prefetchReady: boolean;
  onCardsHydrated?: (listId: string) => void;
  compactMode?: boolean;
}

const DraggableList: React.FC<DraggableListProps> = ({
  list,
  index,
  boardId,
  updateList,
  deleteList,
  prefetchReady,
  onCardsHydrated,
  compactMode = false,
}) => {

  const queryClient = useQueryClient();
  const listReadyReportedRef = useRef(false);
  const params = useParams();
  const resolvedWorkspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string | undefined);
  const {
    cards,
    addCard,
    addCardAsync,
    isLoading,
    isError,
    hasMoreCards,
    isLoadingMore,
    loadMoreCards,
    loadMoreError,
    retryLoadMore,
    totalCards,
  } = useCardsPaginated(list.id, boardId, {
    enabled: prefetchReady,
    compactMode,
    allowFetchInCompact: (list as any).cards_truncated,
    initialTotal:
      (list as any).cards_paginate?.total_data || (list as any).cards_total,
    initialHasMore:
      (list as any).cards_truncated === true ||
      ((list as any).cards_paginate?.next_page ?? null) !== null ||
      ((list as any).cards_total ?? 0) >
        ((list as any).cards?.length ?? 0) ||
      false,
    expectedTotalOverride:
      (list as any).cards_paginate?.total_data ??
      (list as any).cards_total,
    workspaceId: resolvedWorkspaceId,
  });
  const parseCount = (value: any): number => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };
  const cachedCardsQuery = queryClient.getQueryData<any>(
    ["cards", "list", list.id]
  );
  const cachedTotal = parseCount(
    cachedCardsQuery?.paginate?.totalData ??
      cachedCardsQuery?.paginate?.total_data
  );
  const listTotalFromMeta = parseCount(
    (list as any).cards_paginate?.total_data ??
      (list as any).cards_paginate?.totalData ??
      (list as any).cardsPaginate?.totalData
  );
  const effectiveTotalFromHook =
    typeof totalCards === "number" && totalCards > 0
      ? totalCards
      : undefined;
  let displayTotalCards =
    listTotalFromMeta ??
    effectiveTotalFromHook ??
    cachedTotal ??
    cards.length;
  // Never show fewer than we have in memory
  displayTotalCards = Math.max(
    displayTotalCards,
    cards.length,
    (list as any).cards ? (list as any).cards.length : 0
  );
  const pageSize =
    parseCount(
      (list as any).cards_paginate?.limit ??
        (list as any).cardsPaginate?.limit
    ) || 20;
  const canLoadMore =
    hasMoreCards ||
    (displayTotalCards > cards.length && displayTotalCards > pageSize);

  const [renderCount, setRenderCount] = useState<number>(compactMode ? 40 : Infinity);
  const growthTimerRef = useRef<any>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // reset chunking on list change
    setRenderCount(compactMode ? 20 : Infinity);
  }, [list.id, compactMode]);

  useEffect(() => {
    // progressively increase renderCount in compact mode to avoid jank
    if (!compactMode) return;
    if (renderCount >= cards.length) return;
    if (growthTimerRef.current) {
      clearTimeout(growthTimerRef.current);
    }
    growthTimerRef.current = setTimeout(() => {
      setRenderCount((prev) => Math.min(prev + 20, cards.length));
    }, 16);
    return () => {
      if (growthTimerRef.current) clearTimeout(growthTimerRef.current);
    };
  }, [cards.length, renderCount, compactMode]);

  // Auto-load more when sentinel enters the viewport
  useEffect(() => {
    if (!canLoadMore) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoadingMore) {
            loadMoreError ? retryLoadMore() : loadMoreCards();
          }
        });
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [canLoadMore, isLoadingMore, loadMoreCards, loadMoreError, retryLoadMore]);

  useEffect(() => {
    listReadyReportedRef.current = false;
  }, [list.id]);

  useEffect(() => {
    if (
      listReadyReportedRef.current ||
      !prefetchReady ||
      isLoading ||
      isError ||
      !onCardsHydrated
    ) {
      return;
    }

    listReadyReportedRef.current = true;
    onCardsHydrated(list.id);
  }, [isError, isLoading, list.id, onCardsHydrated, prefetchReady]);
  const { canMove, canCreate } = usePermissions();
  const { canMoveList, canCreateCard } = useBoardPermissionsContext();

  // Check if user can move lists and create cards using board-specific permissions
  const canMoveListPermission = canMoveList();
  const canCreateCardPermission = canCreateCard();

  // Check if card limit is exceeded
  const isLimitExceeded = list.cardLimit && cards.length > list.cardLimit;
  const listColor = isLimitExceeded ? "#fbbf24" : list.background || "#f9fafb"; // Yellow if limit exceeded, fallback to light gray

  return (
    <Draggable
      draggableId={`draggable-list-${list.id}`}
      index={index}
      isDragDisabled={!canMoveListPermission}
    >
      {(provided, snapshot) => {
        return (
          <div
            ref={provided.innerRef}
            {...provided.dragHandleProps}
            {...provided.draggableProps}
            style={{
              ...provided.draggableProps.style,
              backgroundColor: listColor, // e.g., "#f87171"
            }}
            className={`
            group 
            relative 
            bg-gray-50 
            rounded-xl 
            border 
            border-gray-200 
            transition-all 
            duration-200 
            shadow-sm 
            hover:shadow-md 
            w-[270px] 
            h-fit
            max-h-[calc(100vh-130px)]
            flex 
            flex-col
            flex-shrink-0
            draggable-list-container
            ${snapshot.isDragging ? "shadow-lg" : ""}
            ${canMoveListPermission ? "cursor-pointer" : "cursor-default"}
            ${!canMoveListPermission ? "opacity-75" : ""}
          
          `}
            title={
              !canMoveListPermission
                ? "You don't have permission to move lists"
                : isLimitExceeded
                ? `Card limit exceeded (${cards.length}/${list.cardLimit})`
                : undefined
            }
          >
              <ListName
                list={list}
                boardId={boardId}
                updateList={updateList}
                deleteList={deleteList}
                cardsCount={cards.length}
                totalCards={displayTotalCards}
              />
            <Droppable
              droppableId={`droppable-card-area-${list.id}`}
              direction="vertical"
              type={`card`}
            >
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`
                   flex-grow
                   custom-scrollbar
                   px-3
                   py-2
                   min-h-[50px]
                   overflow-y-auto              
                 `}
                >
                  <div className="space-y-3">
                    {cards?.slice(0, renderCount).map((card, index) => (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        list={list}
                        index={index}
                        compactMode={compactMode}
                      />
                    ))}
                    {provided.placeholder}

                    {/* Infinite scroll sentinel */}
                    {!isLoading && cards.length > 0 && canLoadMore && (
                      <div
                        ref={loadMoreRef}
                        className="py-2 flex items-center justify-center text-xs text-gray-500"
                      >
                        {isLoadingMore
                          ? "Loading…"
                          : loadMoreError
                          ? "Tap to retry"
                          : "Loading more…"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
            {canCreateCardPermission && (
              <div className="px-2 py-2 border-t border-gray-200">
                <AddCard listId={list.id || ""} addCard={addCard} addCardAsync={addCardAsync} />
              </div>
            )}
          </div>
        );
      }}
    </Draggable>
  );
};

export default DraggableList;

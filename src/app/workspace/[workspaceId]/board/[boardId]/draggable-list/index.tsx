import { Draggable, Droppable, DroppableProvided } from "@hello-pangea/dnd";
import ListName from "./list-name";
import { useCardsPaginated } from "@hooks/card";
import DraggableCard from "../draggable-card";
import AddCard from "./add-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { AnyList } from "@myTypes/list";
import { usePermissions } from "@hooks/account";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";
import { selectCurrentBoard } from "@store/workspace_slice";
import { ChevronsLeft } from "lucide-react";

// ⚠️ TEMPORARY FEATURE FLAG - SET TO false TO ALLOW ALL USERS TO CREATE CARDS
const RESTRICT_CARD_CREATION = false;

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
  collapsed?: boolean;
  onToggleCollapse?: (listId: string) => void;
}

const DraggableList: React.FC<DraggableListProps> = ({
  list,
  index,
  boardId,
  updateList,
  deleteList,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Combine drag ref and visibility ref
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      listRef.current = el;
      if (el) {
        // provided.innerRef will be attached later inside render
      }
    },
    [listRef]
  );

  const {
    cards,
    addCard,
    isLoading,
    isError,
    hasMoreCards,
    isLoadingMore,
    loadMoreCards,
    loadMoreError,
    retryLoadMore,
    totalCards,
    isAddingCard,
  } = useCardsPaginated(list.id, boardId, { enabled: isVisible });
  const { canMove, canCreate } = usePermissions();
  const { canMoveList, canCreateCard } = useBoardPermissionsContext();
  const currentUser = useSelector(selectUser);
  const currentBoard = useSelector(selectCurrentBoard);

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || isLoadingMore || !hasMoreCards || loadMoreError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCards();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoadingMore, hasMoreCards, loadMoreError, loadMoreCards]);

  // Check if user can move lists and create cards using board-specific permissions
  const canMoveListPermission = canMoveList();
  let canCreateCardPermission = canCreateCard();

  // ⚠️ TEMPORARY RESTRICTION - Only super admin on Dateline board can create cards
  if (RESTRICT_CARD_CREATION) {
    const userRole = (currentUser?.role?.name || "").trim().toLowerCase();
    const isSuperAdmin =
      userRole === "super admin" ||
      userRole === "super_admin" ||
      userRole === "superadmin";
    const boardName = (currentBoard?.name || "").trim().toLowerCase();
    const isBoardAllowed = boardName === "dateline" || boardName === "list po selesai";

    // Override permission: only allow if super admin AND on Dateline board
    canCreateCardPermission = canCreateCardPermission && isSuperAdmin && isBoardAllowed;
  }

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
            ref={(el) => {
              setRefs(el);
              provided.innerRef(el);
            }}
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
            ${collapsed ? "w-[72px] min-w-[72px] px-0" : "w-[270px]"} 
            h-fit
            max-h-[calc(100vh-130px)]
            flex 
            ${collapsed ? "flex-col items-center" : "flex-col"}
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
            {collapsed ? (
              <div
                className="flex flex-col items-center justify-center py-4 px-2 gap-2 w-full"
                onClick={() => onToggleCollapse && onToggleCollapse(list.id)}
                style={{ minHeight: "140px" }}
              >
                <div
                  className="whitespace-normal text-center text-sm font-semibold text-gray-700"
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    lineHeight: "1.2",
                  }}
                  title={list.name}
                >
                  {list.name}
                </div>
                <Button
                  type="text"
                  size="small"
                  className="text-gray-500 hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse && onToggleCollapse(list.id);
                  }}
                >
                  <ChevronsLeft size={16} className="rotate-180" />
                </Button>
              </div>
            ) : (
              <>
                <ListName
                  list={list}
                  boardId={boardId}
                  updateList={updateList}
                  deleteList={deleteList}
                  cardsCount={cards.length}
                  totalCards={totalCards}
                  onToggleCollapse={onToggleCollapse}
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
                       relative
                     `}
                    >
                      {/* Loading overlay when adding card */}
                      {isAddingCard && (
                        <div className="absolute inset-0 bg-white/70 z-10 flex items-start justify-center pt-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm bg-white px-3 py-2 rounded-lg shadow-sm">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            Adding card...
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        {cards?.map((card, index) => (
                          <DraggableCard
                            key={card.id}
                            card={card}
                            list={list}
                            index={index}
                          />
                        ))}
                        {provided.placeholder}

                        {/* Load More Button */}
                        {/* Infinite Scroll Sentinel & Loading Indicator */}
                        {!isLoading && cards.length > 0 && (hasMoreCards || isLoadingMore) && !loadMoreError && (
                          <div
                            ref={loadMoreRef}
                            className="flex justify-center p-2 min-h-[40px]"
                          >
                            {isLoadingMore && (
                              <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                              </div>
                            )}
                          </div>
                        )}

                        {/* Retry Button (Only when error) */}
                        {loadMoreError && (
                          <div className="flex flex-col items-center py-2 space-y-2">
                            <div className="text-xs text-red-500 text-center px-2">
                              {loadMoreError}
                            </div>
                            <button
                              onClick={retryLoadMore}
                              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
                {canCreateCardPermission && (
                  <div className="px-2 py-2 border-t border-gray-200">
                    <AddCard listId={list.id || ""} addCard={addCard} />
                  </div>
                )}
              </>
            )}
          </div>
        );
      }}
    </Draggable>
  );
};

export default DraggableList;

import { Draggable, Droppable, DroppableProvided } from "@hello-pangea/dnd";
import ListName from "./list-name";
import { useCardsPaginated } from "@hooks/card";
import DraggableCard from "../draggable-card";
import AddCard from "./add-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnyList } from "@myTypes/list";
import { usePermissions } from "@hooks/account";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";
import { selectCurrentBoard } from "@store/workspace_slice";

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
}

const DraggableList: React.FC<DraggableListProps> = ({
  list,
  index,
  boardId,
  updateList,
  deleteList,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

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
  } = useCardsPaginated(list.id, boardId, { enabled: isVisible });
  const { canMove, canCreate } = usePermissions();
  const { canMoveList, canCreateCard } = useBoardPermissionsContext();
  const currentUser = useSelector(selectUser);
  const currentBoard = useSelector(selectCurrentBoard);

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
              totalCards={totalCards}
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
                    {!isLoading &&
                      cards.length > 0 &&
                      (hasMoreCards || loadMoreError) && (
                        <div className="flex flex-col items-center py-2 space-y-2">
                          {loadMoreError && (
                            <div className="text-xs text-red-500 text-center px-2">
                              {loadMoreError}
                            </div>
                          )}
                          <button
                            onClick={
                              loadMoreError ? retryLoadMore : loadMoreCards
                            }
                            disabled={isLoadingMore}
                            className="
                            px-4 py-2 
                            text-sm 
                            text-gray-600 
                            bg-gray-100 
                            hover:bg-gray-200 
                            disabled:bg-gray-50 
                            disabled:text-gray-400 
                            rounded-lg 
                            border 
                            border-gray-200 
                            transition-colors 
                            duration-200
                            flex 
                            items-center 
                            gap-2
                          "
                          >
                            {isLoadingMore ? (
                              <>
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                              </>
                            ) : loadMoreError ? (
                              "Retry"
                            ) : (
                              "Load More"
                            )}
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
          </div>
        );
      }}
    </Draggable>
  );
};

export default DraggableList;

import { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AnyList } from "@myTypes/list";
import { useCardsPaginated } from "@hooks/card";
import ListName from "../draggable-list/list-name";
import AddCard from "../draggable-list/add-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import ListRow from "./list-row";

interface CollapsibleListSimpleProps {
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

const CollapsibleListSimple: React.FC<CollapsibleListSimpleProps> = ({
  list,
  index,
  boardId,
  updateList,
  deleteList,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const {
    cards,
    addCard,
    hasMoreCards,
    isLoadingMore,
    loadMoreCards,
    loadMoreError,
    retryLoadMore,
    totalCards,
  } = useCardsPaginated(list.id, boardId);
  const { canMoveList, canCreateCard } = useBoardPermissionsContext();

  const isLimitExceeded = list.cardLimit && cards.length > list.cardLimit;
  const listColor = isLimitExceeded ? "#fbbf24" : list.background || "#f9fafb";

  return (
    <Draggable
      draggableId={`draggable-list-${list.id}`}
      index={index}
      isDragDisabled={!canMoveList()}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.dragHandleProps}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: listColor,
          }}
          className={`rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 w-full flex flex-col draggable-list-container ${
            snapshot.isDragging ? "shadow-lg" : ""
          } ${canMoveList() ? "cursor-pointer" : "cursor-default"}`}
          title={
            !canMoveList()
              ? "You don't have permission to move lists"
              : isLimitExceeded
              ? `Card limit exceeded (${cards.length}/${list.cardLimit})`
              : undefined
          }
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-white/60"
            style={{ backgroundColor: list.background || undefined }}
          >
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="mr-2 text-gray-600 hover:text-gray-800"
              aria-label={collapsed ? "Expand list" : "Collapse list"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
            <div className="flex-1 min-w-0">
              <ListName
                list={list}
                boardId={boardId}
                updateList={updateList}
                deleteList={deleteList}
                cardsCount={cards.length}
                totalCards={totalCards}
              />
            </div>
          </div>

          {/* Rows area (table-like) */}
          <Droppable
            droppableId={`droppable-card-area-${list.id}`}
            direction="vertical"
            type="card"
          >
            {(dropProvided) => (
              <div
                {...dropProvided.droppableProps}
                ref={dropProvided.innerRef}
                className={"px-3"}
                style={{
                  overflow: "hidden",
                  maxHeight: collapsed ? 0 : "none",
                  paddingTop: collapsed ? 0 : 8,
                  paddingBottom: collapsed ? 0 : 8,
                  // keep an ultra-small hit area so dropping into a collapsed list remains possible
                  minHeight: collapsed ? 1 : undefined,
                  transition: "max-height 0.2s ease, padding 0.2s ease",
                }}
              >
                {!collapsed && (
                  <div className="space-y-2">
                    {/* Simple table header */}
                    <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] text-[11px] text-gray-600 px-3">
                      <div className="font-semibold">Name</div>
                      <div className="font-semibold">Members</div>
                      <div className="font-semibold">Age</div>
                    </div>
                    {cards.map((card, i) => (
                      <ListRow key={card.id} card={card} index={i} list={list} />
                    ))}
                    {dropProvided.placeholder}
                    {/* Load More Button */}
                    {cards.length > 0 && (hasMoreCards || loadMoreError) && (
                      <div className="flex flex-col items-center py-2 space-y-2">
                        {loadMoreError && (
                          <div className="text-xs text-red-500 text-center px-2">
                            {loadMoreError}
                          </div>
                        )}
                        <button
                          onClick={loadMoreError ? retryLoadMore : loadMoreCards}
                          disabled={isLoadingMore}
                          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg border border-gray-200 transition-colors duration-200"
                        >
                          {isLoadingMore ? "Loading..." : loadMoreError ? "Retry" : "Load More"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Droppable>

          {/* Add card section - only show when expanded */}
          {!collapsed && canCreateCard() && (
            <div className="px-3 py-2 border-t border-gray-200 bg-white/60">
              <AddCard listId={list.id || ""} addCard={addCard} />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default CollapsibleListSimple;
import { Draggable, Droppable, DroppableProvided } from "@hello-pangea/dnd";
import ListName from "./list-name";
import { useCards } from "@hooks/card";
import DraggableCard from "../draggable-card";
import AddCard from "./add-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnyList } from "@myTypes/list";
import { usePermissions } from "@hooks/account";

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
}

const DraggableList: React.FC<DraggableListProps> = ({
  list,
  index,
  boardId,
  updateList,
}) => {
  const { cards, addCard, isLoading, isError } = useCards(list.id, boardId);
  const { canMove, canCreate } = usePermissions();

  // Check if user can move lists and create cards
  const canMoveList = canMove("list");
  const canCreateCard = canCreate("card");

  // Check if card limit is exceeded
  const isLimitExceeded = list.cardLimit && cards.length > list.cardLimit;
  const listColor = isLimitExceeded ? "#fbbf24" : (list.background || "#f9fafb"); // Yellow if limit exceeded, fallback to light gray

  // Debug logging for drag issues
  console.log(`[LIST DEBUG] List "${list.name}" (ID: ${list.id}):`, {
    canMoveList,
    isDragDisabled: !canMoveList,
    listBackground: list.background,
    listColor,
    isLimitExceeded,
    cardCount: cards.length,
    cardLimit: list.cardLimit,
    index,
    draggableId: `draggable-list-${list.id}`,
    permissions: { canMove: canMove("list"), canCreate: canCreate("card") }
  });

  return (
    <Draggable
          draggableId={`draggable-list-${list.id}`}
          index={index}
          isDragDisabled={!canMoveList}
        >
        {(provided, snapshot) => {
          // Debug logging for drag state changes
          if (snapshot.isDragging) {
            console.log(`[DRAG] Currently dragging list "${list.name}" (ID: ${list.id})`);
          }
          
          return (
        <div
          ref={provided.innerRef}
          {...provided.dragHandleProps}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: listColor, // e.g., "#f87171"
          }}
          onMouseDown={(e) => {
            console.log(`[MOUSE DEBUG] MouseDown on list "${list.name}" (ID: ${list.id}), Index: ${index}`);
          }}
          onMouseMove={(e) => {
            // Only log if mouse is pressed (dragging)
            if (e.buttons === 1) {
              console.log(`[MOUSE DEBUG] MouseMove while dragging list "${list.name}" (ID: ${list.id})`);
            }
          }}
          className={`
            group 
            relative 
            bg-gray-50 
            rounded-xl 
            border 
            border-gray-200 
            shadow-sm 
            hover:shadow-md 
            min-w-[270px] 
            h-fit
            max-h-[calc(100vh-130px)]
            flex 
            flex-col
            ${snapshot.isDragging ? "shadow-lg" : ""}
            ${canMoveList ? "cursor-move" : "cursor-default"}
            ${!canMoveList ? "opacity-75" : ""}
          
          `}
          title={
            !canMoveList
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
            cardsCount={cards.length}
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
                `}
              >
                <div className="space-y-3">
                  {cards.map((card, index) => (
                    <DraggableCard
                      key={card.id}
                      card={card}
                      list={list}
                      index={index}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
          {canCreateCard && (
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

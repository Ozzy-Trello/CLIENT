import { Draggable, Droppable, DroppableProvided } from "@hello-pangea/dnd";
import ListName from "./list-name";
import { useCards } from "@/app/hooks/card";
import DraggableCard from "../draggable-card";
import AddCard from "./add-card";
import { UseMutateFunction } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnyList } from "@/app/types/list";
import { useParams } from "next/navigation";

interface DraggableListProps {
  list: AnyList;
  index: number;
  setListsState: React.Dispatch<React.SetStateAction<AnyList[] | undefined>>
  boardId: string;
  updateList: UseMutateFunction<any, Error, { listId: string; updates: Partial<AnyList> }, unknown>;
}

const DraggableList: React.FC<DraggableListProps> = ({
  list,
  index,
  setListsState,
  boardId,
  updateList,
}) => {

  const {cards, addCard, isLoading} = useCards(list.id || "", boardId);

  useEffect(() => {
    setListsState((prev) => 
      prev?.map((item, i) => {
        if (i === index) {
          return { ...item, cards };
        }
        return item;
      })
    );
  }, [cards])
 
  return (
    <Draggable
      key={`draggable-list-${list.id}`}
      draggableId={`draggable-list-${list.id}`}
      index={index}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.dragHandleProps}
          {...provided.draggableProps}
          className={`
            group 
            relative 
            bg-gray-50 
            rounded-xl 
            border 
            border-gray-200 
            shadow-sm 
            transition-all 
            duration-300
            hover:shadow-md 
            min-w-[270px] 
            h-fit
            max-h-[calc(100vh-130px)]
            flex 
            flex-col
          `}
        >
          <ListName list={list} boardId={boardId} updateList={updateList} />
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
         
          <div className="px-2 py-2 border-t border-gray-200">
            <AddCard listId={list.id || ""} addCard={addCard} />
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default DraggableList;
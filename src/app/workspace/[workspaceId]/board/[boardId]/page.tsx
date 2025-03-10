"use client";

import { Button, Input, Skeleton, Empty } from "antd";
import dynamic from "next/dynamic";
import React, { useState, useEffect, useMemo } from "react";
import Topbar from "./topbar";
import { useDispatch, useSelector } from "react-redux";
import { selectSelectedBoard, selectTheme, selectUser } from "@/app/store/app_slice";
import { Plus, X } from "lucide-react";
import useTaskService from "@/app/hooks/task";
import { useAppSelector } from "@/app/store/hook";
import { selectBoardLists } from "@/app/store/list_slice";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";

const ListComponent = dynamic(() => import("@/app/components/list"), {
  ssr: false,
});

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);

const Draggable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Draggable),
  { ssr: false }
);

const Board: React.FC = () => {
  const { currentBoardId, currentBoard, taskService} = useTaskService();
  const currentBoardLists = useAppSelector(state => 
    currentBoardId ? selectBoardLists(state, currentBoardId) : []
  );
  const [isFetching, setIsFetching] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState<string>("");
  const [isAddingNewList, setAddingNewList] = useState(false);
  
  const theme = useSelector(selectTheme);
  const { colors } = theme;
  const dispatch = useDispatch();
  const selectedUser = useSelector(selectUser);
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  
  
  const onDragEnd = (result: any) => {
    const { destination, source, draggableId, type } = result;
  
    if (!destination || !currentBoardLists || !currentBoard) return;
  
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
  
    if (type === "COLUMN") {
      // Use the taskService from the hook's return value
      taskService.reorderListsInBoard(
        currentBoardId!, 
        source.index, 
        destination.index
      );
      
      return;
    }
  
    // For moving cards
    const sourceListId = source.droppableId;
    const destinationListId = destination.droppableId;
    
    // Rest of card handling...
    if (sourceListId === destinationListId) {
      // Reordering within the same list
      taskService.reorderCardsInList(
        sourceListId,
        source.index,
        destination.index
      );
    } else {
      // Moving card between lists
      const cardId = draggableId;
      
      taskService.moveCardBetweenLists(
        cardId,
        sourceListId,
        destinationListId
      );
    }
  };

  const handleAddCard = (listId: string, cardTitle: string) => {
    if (!cardTitle || !currentBoardId) return;
    
    // Create a new card in the specified list
    taskService.createCard(listId, currentBoardId, cardTitle);
  };
  
  const handleAddList = () => {
    if (!newColumnTitle || !currentBoardId) return;
    
    // Create a new list in the current board
    taskService.createList(currentBoardId, newColumnTitle);
    
    // Reset state
    setNewColumnTitle("");
    setAddingNewList(false);
  };
  
  const handleChangeListTitle = (listId: string, newTitle: string) => {
    if (!newTitle || !currentBoardId) return;
    
    // Update the list title
    taskService.updateListDetails(listId, { title: newTitle });
  };

  return (
    <div className="h-screen overflow-y-hidden" style={{
      width: collapsed ? `calc(100%-${siderSmall})` : `calc(100%-${siderWide})`
    }}>
      <Topbar />
      <div
        className="pt-[50px] h-[calc(100vh-50px)] overflow-x-auto overflow-y-hidden min-w-[200px]"
        style={{marginTop: "45px"}}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable
            droppableId="all-lists"
            direction="horizontal"
            type="COLUMN"
          >
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex gap-4 p-4 items-start"
              >
                {!isFetching && currentBoardLists && (
                  currentBoardLists.map((list, index) => {
                    const isFilterList = list.type === 'filter';
  
                    return (
                      <Draggable
                        key={list.id}
                        draggableId={list.id}
                        index={index}
                        isDragDisabled={isFilterList} // Don't allow dragging filter lists
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex flex-col"
                            style={{
                              ...provided.draggableProps.style,
                            }}
                          >
                            <ListComponent
                              list={list}
                              index={index}
                              provided={provided}
                              addCard={handleAddCard}
                              changeColumnTitle={handleChangeListTitle}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                )}

                {/* Add list section*/}
                {isAddingNewList ? (
                  <div className="add-list-wrapper">
                    <Input
                      type="text"
                      placeholder="New List Title"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onPressEnter={handleAddList}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="small" onClick={handleAddList}>Add List</Button>
                      <Button 
                        size="small" 
                        onClick={() => setAddingNewList(false)} 
                        icon={<X size={15}/>}
                      />
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setAddingNewList(true)} 
                    className="mt-2" 
                    icon={<Plus size={15}/>}
                  >
                    Add a list
                  </Button>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Skeleton loading state */}
        {isFetching && (
          <div className="flex gap-2.5 m-5">
            {[1,2,3,4].map((item) => (
              <Skeleton.Node 
                key={item} 
                active={isFetching} 
                className="w-[272px] h-[400px]" 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Board;
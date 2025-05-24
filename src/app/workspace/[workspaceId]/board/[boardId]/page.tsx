"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
import BoardTopbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme, selectUser } from "@store/app_slice";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import { useListMove, useLists } from "@hooks/list";
import { useParams, useSearchParams } from "next/navigation";
import { generateId } from "@utils/general";
import { Droppable, DropResult } from "@hello-pangea/dnd";
import List from "./draggable-list";
import { Button, Input } from "antd";
import { Plus, X } from "lucide-react";
import { CardDetailProvider } from "@providers/card-detail-context";
import CardDetails from "./card-details";
import ListSkeleton from "./list-skeleton.tsx";
import BoardScopeMenu from "@components/board-scope-menu";
import { useCardMove, useCards } from "@hooks/card";
import ModalDashcard from "@components/dashcard/modal-dashcard";
import { DashcardConfig } from "@myTypes/dashcard";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Board: React.FC = () => {
  const { boardId } = useParams();
  const searchParams = useSearchParams();
  const theme = useSelector(selectTheme);
  const { colors } = theme;
  const selectedUser = useSelector(selectUser);
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const { lists, addList, pagination, isLoading, updateList } = useLists(Array.isArray(boardId) ? boardId[0] : boardId);
  const [ listData, setListData ] = useState<AnyList[]>();
  const [ isAddingList, setIsAddingList ] = useState<boolean>(false);
  const [ newListName, setNewListName ] = useState<string>("");
  const [ boardScopeMenu, setBoardScopeMenu] = useState<boolean>(false);
  const { updateCard, addCard } = useCards("", "");
  const { moveCard } = useCardMove();
  const { moveList } = useListMove();
  const [ openDashcardModal, setOpenDashcardModal ] = useState<boolean>(false);
  const [ dashcardConfig, setDashcardConfig ] = useState<DashcardConfig>();

  const onListDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, type, draggableId } = result;
      console.log("onListDragEnd", result);
      
      // Drop outside any droppable area
      if (!destination) return;
      
      // If dropped in the same position, exit
      if ( destination.droppableId === source.droppableId && destination.index === source.index) return;

      switch(type) {
        case "list" :
          handleListDragEnd(draggableId, source.index, destination.index);
          break;
        case "card":
          handleCardDragEnd(source.droppableId, source.index, destination.droppableId, destination.index, draggableId);
      }
    },
    [listData, updateCard]
  );

  const handleListDragEnd = (draggabelId: string, sourceIndex: number, destIndex: number): void => {
    // setListData((prev) => {
    //   const copyList = [...(prev || [])];
    //   const [movedItem] = copyList.splice(from, 1);      
    //   copyList.splice(to, 0, movedItem);
    //   return copyList;
    // }); 
    const listId = draggabelId?.replaceAll("draggable-list-", "");

    moveList({
      listId: listId,
      previousPosition: sourceIndex,
      targetPosition: destIndex,
      boardId: Array.isArray(boardId) ? boardId[0] : boardId,
    });   
  }

  const handleCardDragEnd = (sourceList: string, sourceIndex: number, destList: string, destIndex: number, cardId: string): void => {
    
    const sourceListId = sourceList?.replaceAll("droppable-card-area-", "");
    const destListId = destList?.replaceAll("droppable-card-area-", "");

    moveCard({
      cardId: cardId,
      previousListId: sourceListId,
      targetListId: destListId,
      previousPosition: sourceIndex,
      targetPosition: destIndex,
    });
  }

  const handleAddList = (): void => {
    if (!newListName || !boardId) return;
    
    const newList: AnyList = {
      id: generateId(),
      boardId: Array.isArray(boardId) ? boardId[0] : boardId,
      name: newListName
    };
    addList(newList);
    setNewListName("");
    setIsAddingList(false);
  }

  const onDashcardSave = (dashcardConfig: DashcardConfig): void => {
    if (lists?.length > 0) {
      const listId = lists[0]?.id;
      const card: Card = {
        id: dashcardConfig.id,
        listId: listId,
        name: dashcardConfig?.name,
        type: EnumCardType.Dashcard,
        dashConfig: dashcardConfig
      }

      addCard({ card, listId });
    }
  }

  useEffect(() => {
    setListData(lists);
  }, [lists]);

  return (
    <div 
      className="h-screen overflow-y-hidden mr-4" 
      style={{
       width: collapsed ? `calc(100%-${siderSmall})` : `calc(100%-${siderWide})`
      }}
    >
      <BoardTopbar 
        boardScopeMenuOpen={boardScopeMenu} 
        setBoardScopeMenuOpen={setBoardScopeMenu} 
        openDashcardModal={openDashcardModal} setOpenDashcardModal={setOpenDashcardModal}
      />
      <CardDetailProvider>
        <div className="pt-[50px] h-[calc(100vh-30px)] overflow-x-auto overflow-y-hidden min-w-[200px]">
          {!isLoading && (
            <DragDropContext onDragEnd={onListDragEnd}>
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
                    {listData?.map((list, index) => {
                      return (
                        <List 
                          key={`list-${index}`}
                          list={list}
                          setListsState={setListData}
                          index={index} 
                          boardId={Array.isArray(boardId) ? boardId[0] : boardId} 
                          updateList={updateList}
                        />
                      )
                    })}
                    {provided.placeholder}

                    {/* Add list section*/}
                    { isAddingList ? (
                      <div className="add-list-wrapper p-4 rounded-sm bg-white shadow-sm">
                        <Input
                          type="text"
                          placeholder="New List Title"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onPressEnter={handleAddList}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Button size="small" onClick={handleAddList}>Add List</Button>
                          <Button 
                            size="small" 
                            onClick={() => setIsAddingList(false)} 
                            icon={<X size={15}/>}
                          />
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setIsAddingList(true)} 
                        className="mt-2" 
                        icon={<Plus size={15}/>}
                      >
                        Add a list
                      </Button>
                    )}

                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {isLoading && (
            <ListSkeleton />
          )}
        </div>

        <CardDetails />
        
        <BoardScopeMenu
          visible={boardScopeMenu}
          setIsVisible={setBoardScopeMenu}
        />

        <ModalDashcard 
          open={openDashcardModal} setOpen={setOpenDashcardModal}
          onSave={onDashcardSave} initialData={dashcardConfig}
        />
      </CardDetailProvider>
    </div>
  );
};

export default Board;
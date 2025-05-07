"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
import BoardTopbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme, selectUser } from "@/app/store/app_slice";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { useLists } from "@/app/hooks/list";
import { useParams, useSearchParams } from "next/navigation";
import { generateId } from "@/app/utils/general";
import { Droppable, DropResult } from "@hello-pangea/dnd";
import List from "./draggable-list";
import { Button, Input } from "antd";
import { Plus, X } from "lucide-react";
import { CardDetailProvider } from "@/app/provider/card-detail-context";
import CardDetails from "./card-details";
import ListSkeleton from "./list-skeleton.tsx";
import BoardScopeMenu from "@/app/components/board-scope-menu";
import { useCardMove, useCards } from "@/app/hooks/card";
import { useQueryClient } from "@tanstack/react-query";
import { AnyList } from "@/app/types/list";

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
  const { updateCard } = useCards("");
  const { moveCard } = useCardMove();


  const onListDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, type, draggableId } = result;
      
      // Drop outside any droppable area
      if (!destination) return;
      
      // If dropped in the same position, exit
      if ( destination.droppableId === source.droppableId && destination.index === source.index) return;

      switch(type) {
        case "list" :
          handleListDragEnd(source.index, destination.index);
          break;
        case "card":
          handleCardDragEnd(source.droppableId, destination.droppableId, draggableId);
      }
    },
    [listData, updateCard]
  );

  const handleListDragEnd = (from: number, to: number): void => {
    setListData((prev) => {
      const copyList = [...(prev || [])];
      const [movedItem] = copyList.splice(from, 1);      
      copyList.splice(to, 0, movedItem);
      return copyList;
    });    
  }

  const handleCardDragEnd = (sourceList: string, destList: string, cardId: string): void => {
    
    const sourceListId = sourceList?.replaceAll("droppable-card-area-", "");
    const destListId = destList?.replaceAll("droppable-card-area-", "");

    if (sourceList === destList) {

    } else {
      // updateCard({
      //   cardId: cardId,
      //   updates: { 
      //     listId: destListId
      //   },
      //   listId: sourceListId,
      //   destinationListId: destListId
      // });
      moveCard({
        cardId: cardId,
        previousListId: sourceListId,
        targetListId: destListId,
        previousPosition: 0,
        targetPosition: 0,
      });
    }
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

  useEffect(() => {
    setListData(lists);
  }, [lists]);

  // useEffect(() => {
  //   if (searchParams.has("cardId")) {
  //     setBoardScopeMenu(true);
  //   } else {
  //     setBoardScopeMenu(false);
  //   }
  // }, [window.location.href])

  return (
    <div 
      className="h-screen overflow-y-hidden mr-4" 
      style={{
       width: collapsed ? `calc(100%-${siderSmall})` : `calc(100%-${siderWide})`
      }}
    >
      <BoardTopbar boardScopeMenuOpen={boardScopeMenu} setBoardScopeMenuOpen={setBoardScopeMenu} />
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
      </CardDetailProvider>
    </div>
  );
};

export default Board;
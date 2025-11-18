"use client";

import dynamic from "next/dynamic";
import React from "react";
import { AnyList } from "@myTypes/list";
import CollapsibleListSimple from "../list-view/collapsible-list-simple";
import { UseMutateFunction } from "@tanstack/react-query";
import { Button, Input } from "antd";
import { Plus, X } from "lucide-react";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const Droppable = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.Droppable),
  { ssr: false }
);

interface ListViewProps {
  lists: AnyList[] | undefined;
  isLoading: boolean;
  shouldRenderLists: boolean;
  onListDragEnd: (result: any) => void;
  onDragStart: (start: any) => void;
  onDragUpdate: (update: any) => void;
  resolvedBoardId: string;
  updateList: UseMutateFunction<
    any,
    Error,
    { listId: string; updates: Partial<AnyList> },
    unknown
  >;
  deleteList: UseMutateFunction<any, Error, { listId: string }, unknown>;
  isAddingList: boolean;
  setIsAddingList: (value: boolean) => void;
  newListName: string;
  setNewListName: (value: string) => void;
  handleAddList: () => void;
}

const ListViewSimple: React.FC<ListViewProps> = ({
  lists,
  isLoading,
  shouldRenderLists,
  onListDragEnd,
  onDragStart,
  onDragUpdate,
  resolvedBoardId,
  updateList,
  deleteList,
  isAddingList,
  setIsAddingList,
  newListName,
  setNewListName,
  handleAddList,
}) => {
  if (!shouldRenderLists) {
    return <div className="p-4">{/* TODO: skeleton for list view */}</div>;
  }

  return (
    <div className="p-4">
      <DragDropContext
        onDragEnd={onListDragEnd}
        onDragStart={onDragStart}
        onDragUpdate={onDragUpdate}
      >
        <Droppable droppableId="droppable-list-area" direction="vertical" type="list">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3 list-view-droppable"
              style={{
                backgroundColor: snapshot.isDraggingOver ? "#e3f2fd" : "transparent",
              }}
            >
              {lists?.map((list: AnyList, index: number) => (
                <CollapsibleListSimple
                  key={list.id}
                  list={list}
                  index={index}
                  boardId={resolvedBoardId}
                  updateList={updateList}
                  deleteList={deleteList}
                />
              ))}
              {provided.placeholder}

              {/* Add list section */}
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
                    <Button size="small" onClick={() => setIsAddingList(false)} icon={<X size={15} />} />
                  </div>
                </div>
              ) : (
                <Button onClick={() => setIsAddingList(true)} className="mt-2" icon={<Plus size={15} />}>
                  Add a list
                </Button>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Local style override so vertical placeholders are compact in List view */}
      <style jsx>{`
        .list-view-droppable [data-rbd-placeholder-context-id] {
          min-height: 40px !important;
          margin: 6px 0 !important;
          min-width: auto !important;
          border-radius: 6px !important;
        }
      `}</style>
    </div>
  );
};

export default ListViewSimple;
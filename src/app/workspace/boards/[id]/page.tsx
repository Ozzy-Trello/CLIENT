"use client";

import { BoardData, Column } from "@/app/types";
import { Button, Input, Skeleton, Space } from "antd";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import Topbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme } from "@/app/store/slice";
import { getTaskById } from "@/dummy-data";
import "../style.css";

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

const initialData: BoardData = {
  columns: {
    "column-1": {
      id: "column-1",
      title: "To Do",
      taskIds: ["1", "2"],
    },
    "column-2": {
      id: "column-2",
      title: "In Progress",
      taskIds: ["3"],
    },
    "column-3": {
      id: "column-3",
      title: "Done",
      taskIds: [],
    },
  },
  tasks: {
    "1": getTaskById('1'),
    "2": getTaskById('2'),
    "3": getTaskById('3')
  },
  columnOrder: ["column-1", "column-2", "column-3"],
};

const Board: React.FC = () => {
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [data, setData] = useState<BoardData | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState<string>("");
  const [isAddingNewColumn, setAddingNewColumn] = useState(false);
  const theme = useSelector(selectTheme);
  const { colors } = theme;

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "COLUMN") {
      const newColumnOrder = Array.from(data.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      setData({
        ...data,
        columnOrder: newColumnOrder,
      });
      return;
    }

    const startColumn: Column = data.columns[source.droppableId];
    const endColumn: Column = data.columns[destination.droppableId];

    if (startColumn === endColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        taskIds: newTaskIds,
      };

      setData({
        ...data,
        columns: {
          ...data.columns,
          [newColumn.id]: newColumn,
        },
      });
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);

    const endTaskIds = Array.from(endColumn.taskIds);
    endTaskIds.splice(destination.index, 0, draggableId);

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [endColumn.id]: { ...endColumn, taskIds: endTaskIds },
      },
    });
  };

  const addCard = (columnId: string, newCardContent: string) => {
    if (!newCardContent) return;
    const newTaskId = `task-${Object.keys(data.tasks).length + 1}`;
    const newTask = {
      id: newTaskId,
      title: newCardContent,
    };
    const newColumn = data.columns[columnId];
    const newTaskIds = [...newColumn.taskIds, newTaskId];

    setData({
      ...data,
      tasks: {
        ...data.tasks,
        [newTaskId]: newTask,
      },
      columns: {
        ...data.columns,
        [columnId]: {
          ...newColumn,
          taskIds: newTaskIds,
        },
      },
    });
  };

  const addColumn = () => {
    if (!newColumnTitle) return;
    const newColumnId = `column-${Object.keys(data.columns).length + 1}`;
    const newColumn = {
      id: newColumnId,
      title: newColumnTitle,
      taskIds: [],
    };

    setData({
      ...data,
      columns: {
        ...data.columns,
        [newColumnId]: newColumn,
      },
      columnOrder: [...data.columnOrder, newColumnId],
    });
    setNewColumnTitle("");
  };

  const changeColumnTitle = (columnId: string, newTitle: string) => {
    if (data) {
      setData({
        ...data,
        columns: {
          ...data.columns,
          [columnId]: {
            ...data.columns[columnId],
            title: newTitle,
          },
        },
      });
    }
  };

  const enableAddingColumn = () => {
    setAddingNewColumn(true);
  }

  const disableAddingColumn = () => {
    setAddingNewColumn(false);
  }

  useEffect(() => {
    const fetchData = () => {
      setData(initialData);
    }

    if (isFetching) {
      setTimeout(() => {
        fetchData();
        setIsFetching(false);
      }, 3000);
    }

  }, [isFetching])

  return (
    <div style={{ height: "100vh", overflowY: "hidden"}}>
      <Topbar />
      <div
        style={{
          overflow: "scroll",
          marginTop: "0px",
          width: "100%",
          height: "100vh",
          paddingBottom: "100px",
        }}
      >
        { !isFetching && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable
              droppableId="all-columns"
              direction="horizontal"
              type="COLUMN"
            >
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    padding: "1rem",
                    alignItems: "flex-start",
                  }}
                >
                  {data?.columnOrder.map((columnId, index) => {
                    const column = data.columns[columnId];
                    const tasks = column.taskIds.map(
                      (taskId) => data.tasks[taskId]
                    );

                    return (
                      <Draggable
                        key={column.id}
                        draggableId={column.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              display: "flex",
                              flexDirection: "column",
                            }}
    
                          >
                            <ListComponent
                              column={column}
                              tasks={tasks}
                              index={index}
                              provided={provided}
                              addCard={addCard}
                              changeColumnTitle={changeColumnTitle}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  <div
                    style={{
                      marginLeft: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      background: colors?.background,
                      padding: "2rem",
                      borderRadius: "0.5rem",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    { isAddingNewColumn ? (
                      <div>
                        <Input
                          type="text"
                          placeholder="New Column Title"
                          value={newColumnTitle}
                          onChange={(e) => setNewColumnTitle(e.target.value)}
                        />
                        <div className="fx-h-l-center">
                          <Button size="small" onClick={disableAddingColumn}>Add List</Button>
                          <Button size="small" onClick={addColumn}><i className="fi fi-rr-cross"></i></Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={enableAddingColumn} style={{ marginTop: "8px" }}>
                        <i className="fi fi-br-plus"></i>
                        <span>Add another list</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        
        {/* Skeleton */}
        { isFetching && (
          <div style={{display: "flex", gap:"10px", margin: "20px"}}>
          { [1,2,3].map((item) => (
            <Skeleton.Node active={isFetching} style={{ width: 272, height:400 }} />
          )) }
          </div>
        )}
      </div>
    </div>
  );
};

export default Board;

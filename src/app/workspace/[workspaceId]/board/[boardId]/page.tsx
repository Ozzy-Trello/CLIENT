"use client";

import { BoardData } from "@/app/dto/types";
import { Button, Input, Skeleton } from "antd";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import Topbar from "./topbar";
import { useSelector } from "react-redux";
import { selectTheme } from "@/app/store/slice";
import { getTaskById } from "@/dummy-data";
import "../style.css";
import "./style.css";
import { Plus, X } from "lucide-react";

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
const initialData: BoardData | null = null;
// const initialData: BoardData = {
//   columns: {
//     "column-1": {
//       id: "column-1",
//       type: "counter",
//       title: "Filter Design Pending",
//       taskIds: ["1", "2"],
//     }, 
//     "column-2": {
//       id: "column-2",
//       type: "counter",
//       title: "Filter Deal Maker",
//       taskIds: ["3", "4"],
//     }, 
//     "column-3": {
//       id: "column-3",
//       type: "flow",
//       title: "To Do",
//       taskIds: ["5", "6"],
//     },
//     "column-4": {
//       id: "column-4",
//       title: "In Progress",
//       type: "flow",
//       taskIds: ["7", "8"],
//     },
//     "column-5": {
//       id: "column-3",
//       type: "flow",
//       title: "Done",
//       taskIds: ["9"],
//     },
//   },
//   tasks: {
//     "1": getTaskById('1'),
//     "2": getTaskById('2'),
//     "3": getTaskById('3'),
//     "4": getTaskById('4'),
//     "5": getTaskById('5'),
//     "6": getTaskById('6'),
//     "7": getTaskById('7'),
//     "8": getTaskById('8'),
//     "9": getTaskById('9'),
//     "10": getTaskById('10'),
//   },
//   columnOrder: ["column-1", "column-2", "column-3", "column-4", "column-5"],
// };

const Board: React.FC = () => {
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [data, setData] = useState<BoardData | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState<string>("");
  const [isAddingNewColumn, setAddingNewColumn] = useState(false);
  const theme = useSelector(selectTheme);
  const { colors } = theme;

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId, type } = result;
  
    if (!destination || !data) return;
  
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
  
    // Get columns with type checking
    const startColumn = data.columns[source.droppableId];
    const endColumn = data.columns[destination.droppableId];
  
    // Add type guard
    if (!startColumn || !endColumn) return;
  
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
      if (!newCardContent || !data) return;
      
      const newTaskId = `task-${Object.keys(data.tasks).length + 1}`;
      const newTask = {
        id: newTaskId,
        title: newCardContent,
      };
      
      const newColumn = data.columns[columnId];
      if (!newColumn) return;

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
      if (!newColumnTitle || !data) return;
      
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
      if (initialData) {
        setData(initialData);
      }
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
          paddingTop: "50px",
          height: "calc(100vh - 50px)",
          overflowX: "scroll",
          overflowY: "hidden",
          minWidth: "200px",
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
                    const tasks = column.taskIds.map((taskId) => {
                      return data.tasks[taskId]
                    });

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

                  {/* Add list section*/}
                  { isAddingNewColumn ? (
                    <div className="add-list-wrapper">
                      <Input
                        type="text"
                        placeholder="New Column Title"
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                      />
                      <div className="fx-h-left-center">
                        <Button size="small" onClick={disableAddingColumn}>Add List</Button>
                        <Button size="small" onClick={addColumn} icon={<X size={15}/>}></Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={enableAddingColumn} style={{ marginTop: "8px" }} icon={<Plus size={15}/>}>
                      Add a list
                    </Button>
                  )}
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

"use client";

import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { BoardData } from "@/app/types";
import ListComponent from "../list";

const initialData: BoardData = {
  columns: {
    "column-1": {
      id: "column-1",
      title: "To Do",
      taskIds: ["task-1", "task-2"],
    },
    "column-2": {
      id: "column-2",
      title: "In Progress",
      taskIds: ["task-3"],
    },
    "column-3": {
      id: "column-3",
      title: "Done",
      taskIds: [],
    },
  },
  tasks: {
    "task-1": { id: "task-1", content: "Learn Next.js" },
    "task-2": { id: "task-2", content: "Implement Drag-and-Drop" },
    "task-3": { id: "task-3", content: "Review Code" },
  },
  columnOrder: ["column-1", "column-2", "column-3"],
};

const TrelloBoard: React.FC = () => {
  const [data, setData] = useState(initialData);
  const [newColumnTitle, setNewColumnTitle] = useState<string>("");

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

    const startColumn = data.columns[source.droppableId];
    const endColumn = data.columns[destination.droppableId];

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
    if (!newCardContent) return; // Avoid adding an empty card
    const newTaskId = `task-${Object.keys(data.tasks).length + 1}`;
    const newTask = {
      id: newTaskId,
      content: newCardContent,
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
    if (!newColumnTitle) return; // Avoid adding a column without a title
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
    setNewColumnTitle(""); // Clear the input
  };

  const changeColumnTitle = (columnId: string, newTitle: string) => {
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
  };

  return (
    <div>
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
              {data.columnOrder.map((columnId, index) => {
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
                          changeColumnTitle={changeColumnTitle} // Pass down the changeTitle function
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              {/* Add New Column Button */}
              <div
                style={{
                  marginLeft: "1rem",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <input
                  type="text"
                  placeholder="New Column Title"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                />
                <button onClick={addColumn} style={{ marginTop: "8px" }}>
                  Add List
                </button>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default TrelloBoard;

import React, { useState, useRef, useEffect, FC } from "react";
import {
  DraggableProvided,
  Droppable,
  DroppableProps,
  DroppableProvided,
  DroppableStateSnapshot,
} from "@hello-pangea/dnd";
import TaskComponent from "../task";
import { Button } from "antd";
import type { Task } from "@/app/types";

interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

interface ListComponentProps {
  column: Column;
  tasks: Task[];
  index: number;
  provided: DraggableProvided;
  addCard: (columnId: string, newCardContent: string) => void;
  changeColumnTitle: (columnId: string, newTitle: string) => void;
}

const ListComponent: FC<ListComponentProps> = ({
  column,
  tasks,
  provided,
  addCard,
  changeColumnTitle,
  index,
}) => {
  const [newCardContent, setNewCardContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const columnRef = useRef<HTMLDivElement | null>(null);

  const handleTitleClick = (): void => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewTitle(e.target.value);
  };

  const handleTitleBlur = (): void => {
    if (newTitle.trim() && newTitle !== column.title) {
      changeColumnTitle(column.id, newTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (e.key === "Enter") {
      handleTitleBlur();
    }
  };

  const handleAddCardClick = (): void => {
    setIsAddingCard(true);
  };

  const handleCancelAddCard = (): void => {
    setIsAddingCard(false);
    setNewCardContent("");
  };

  const handleAddCardChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setNewCardContent(e.target.value);
  };

  const handleAddCardSubmit = (): void => {
    const trimmedContent = newCardContent.trim();
    if (trimmedContent) {
      addCard(column.id, trimmedContent);
      setNewCardContent("");
      setIsAddingCard(false);
    }
  };

  const handleClickOutside = (e: MouseEvent): void => {
    if (columnRef.current && !columnRef.current.contains(e.target as Node)) {
      setIsEditingTitle(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={columnRef}
      {...provided.draggableProps}
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#a4b0be",
        borderRadius: "8px",
        padding: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        minWidth: "275px",
      }}
    >
      {isEditingTitle ? (
        <input
          type="text"
          value={newTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          autoFocus
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            border: "none",
            background: "#f9fafb",
            padding: "0.5rem",
            width: "100%",
            outline: "none",
            borderBottom: "2px solid #3b82f6",
            color: "#333",
          }}
        />
      ) : (
        <h3
          onClick={handleTitleClick}
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "1rem",
            color: "#333",
          }}
        >
          {column.title}
        </h3>
      )}

      <Droppable droppableId={column.id} type="TASK">
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              flex: 1,
              transition: "background-color 0.2s ease",
              marginBlock: snapshot.isDraggingOver ? "1rem" : "0",
            }}
          >
            {tasks.map((task, index) => (
              <TaskComponent key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
            {!tasks.length && "This list is still empty"}
          </div>
        )}
      </Droppable>

      {isAddingCard ? (
        <div style={{ marginTop: "1rem" }}>
          <input
            type="text"
            placeholder="Enter card content"
            value={newCardContent}
            onChange={handleAddCardChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddCardSubmit();
              }
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              width: "100%",
              marginBottom: "0.5rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button size="small" onClick={handleAddCardSubmit}>
              Add Card
            </Button>
            <Button size="small" onClick={handleCancelAddCard}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="small"
          onClick={handleAddCardClick}
          style={{
            marginTop: "1rem",
            borderRadius: "0.5rem",
            background: "whitesmoke",
          }}
        >
          + Add a card
        </Button>
      )}
    </div>
  );
};

export default ListComponent;

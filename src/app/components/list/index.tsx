import React, { useState, useRef, useEffect } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Task } from "@/app/types";
import TaskComponent from "../task";

interface ListComponentProps {
  column: { id: string; title: string; taskIds: string[] };
  tasks: Task[];
  index: number;
  provided: any;
  addCard: (columnId: string, newCardContent: string) => void;
  changeColumnTitle: (columnId: string, newTitle: string) => void;
}

const ListComponent: React.FC<ListComponentProps> = ({
  column,
  tasks,
  index,
  provided,
  addCard,
  changeColumnTitle,
}) => {
  const [newCardContent, setNewCardContent] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>(column.title);

  const columnRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (newTitle !== column.title) {
      changeColumnTitle(column.id, newTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    }
  };

  const handleAddCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCardContent(e.target.value);
  };

  const handleAddCardSubmit = () => {
    if (newCardContent.trim() !== "") {
      addCard(column.id, newCardContent);
      setNewCardContent("");
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
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
      {...provided.droppableProps}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "300px",
        backgroundColor: "#f0f4f8",
        borderRadius: "8px",
        padding: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      }}
    >
      {isEditingTitle ? (
        <input
          ref={inputRef}
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
            marginBottom: "1rem",
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
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {tasks.map((task, index) => (
              <TaskComponent key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <input
        type="text"
        placeholder="Add new Card"
        value={newCardContent}
        onChange={handleAddCardChange}
        onKeyDown={(e) => e.key === "Enter" && handleAddCardSubmit()}
        style={{
          fontSize: "16px",
          padding: "0.5rem",
          marginTop: "1rem",
          backgroundColor: "#ffffff",
          border: "1px solid #ddd",
          borderRadius: "4px",
          outline: "none",
          width: "100%",
          color: "#333",
        }}
      />
    </div>
  );
};

export default ListComponent;

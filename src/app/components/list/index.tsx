import React, { useState, useRef, useEffect, FC } from "react";
import {
  DraggableProvided,
  Droppable,
  DroppableProps,
  DroppableProvided,
  DroppableStateSnapshot,
} from "@hello-pangea/dnd";
import TaskComponent from "../task";
import { Badge, Button, Input, Typography } from "antd";
import type { Task } from "@/app/dto/types";
import { useSelector } from "react-redux";
import { selectTheme } from "@/app/store/slice";
import { Ellipsis } from "lucide-react";

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
  const theme = useSelector(selectTheme);
  const { colors } = theme;

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
      className="list-column"
      ref={columnRef}
      {...provided.draggableProps}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "8px",
        padding: "1rem",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        minWidth: "275px",
        background: `rgb(${colors?.background})`,
        height: `fit-content`,
        maxHeight: `calc(100vh - 130px)`,
        overflowY: "hidden"
      }}
    >
      <div className="list-colum-title-wrapper fx-h-sb-center">
        {isEditingTitle ? (
          <Input
            type="text"
            variant="borderless"
            value={newTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            style={{
              fontSize: "15px",
              fontWeight: "bold",
              border: "none",
              background: "#f9fafb",
              padding: "0.5rem",
              width: "100%",
            }}
          />
        ) : (
          <Typography.Title
            onClick={handleTitleClick}
            level={5}
            style={{
              fontSize: "15px",
              fontWeight: "bold",
              cursor: "pointer",
              marginTop: "0",
              marginBottom: "1rem",
              color: "#333",
            }}
          >
            {column.title}
          </Typography.Title>
        )}
       
        <div className="fx-h-right-center">
          <Badge size="small" count="1/9" />
          <Button size="small"><Ellipsis size={14}/></Button>
        </div>
      </div>

      <Droppable droppableId={column.id} type="TASK">
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              flex: 1,
              transition: "background-color 0.2s ease",
              marginBlock: snapshot.isDraggingOver ? "1rem" : "0",
              maxWidth: "272px",
              overflowY: "auto",
              padding: "0px 5px",
            }}
          >
            {tasks?.map((task, index) => (
              <TaskComponent key={task?.id} task={task} index={index} />
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
        <div className="fullwidth fx-v-end" style={{minHeight: "40px"}}>
          <Button
            className="fullwidth"
            onClick={handleAddCardClick}
          >
          + Add a card
        </Button>
        </div>
      )}
    </div>
  );
};

export default ListComponent;

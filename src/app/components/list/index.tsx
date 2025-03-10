import React, { useState, useRef, useEffect, FC, Fragment } from "react";
import {
  DraggableProvided,
  Droppable,
  DroppableProvided,
  DroppableStateSnapshot,
} from "@hello-pangea/dnd";
import { Badge, Button, Input, Typography } from "antd";
import type { AnyList, Card } from "@/app/dto/types";
import { useSelector } from "react-redux";
import { selectTheme } from "@/app/store/app_slice";
import { Ellipsis, MessageSquare, Paperclip, Plus } from "lucide-react";
import ListCard from "../list-card";
import { useAppSelector } from "@/app/store/hook";
import { selectCardsByList } from "@/app/store/card_slice";

interface ListComponentProps {
  list: AnyList;
  index: number;
  provided: DraggableProvided;
  addCard: (columnId: string, newCardContent: string) => void;
  changeColumnTitle: (columnId: string, newTitle: string) => void;
}

const ListComponent: FC<ListComponentProps> = ({
  list,
  provided,
  addCard,
  changeColumnTitle,
  index,
}) => {
  const cards = useAppSelector(state => selectCardsByList(state, list.id)) || [];
  const [newCardContent, setNewCardContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(list.title);
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
    if (newTitle.trim() && newTitle !== list.title) {
      changeColumnTitle(list.id, newTitle.trim());
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
      addCard(list.id, trimmedContent);
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
      className="flex flex-col rounded-xl bg-white p-4 shadow-md min-w-[275px] h-fit max-h-[calc(100vh-130px)] overflow-y-hidden"
      ref={columnRef}
      {...provided.draggableProps}
    >
      <div className="flex justify-between items-center mb-2">
        {isEditingTitle ? (
          <Input
            type="text"
            variant="borderless"
            value={newTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="text-base font-bold border-none bg-gray-50 p-2 w-full"
          />
        ) : (
          <Typography.Text
            onClick={handleTitleClick}
            className="text-xs font-bold cursor-pointer mt-0 mb-0 text-gray-800"
          >
            {list.title}
          </Typography.Text>
        )}
       
        <div className="flex items-center justify-end gap-1">
          <div className="bg-gray-200 text-gray-600 rounded-full px-2 py-1 text-xs">
            {cards?.length || 0}
          </div>
          <Button type="text" size="small" className="flex items-center justify-center">
            <span className="flex">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 3L2 8L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 3L22 8L17 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Button>
          <Button type="text" size="small"><Ellipsis size={16}/></Button>
        </div>
      </div>

      <Droppable droppableId={list.id} type="TASK">
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2 flex-1 overflow-y-auto"
            style={{
              minHeight: "40px",
              backgroundColor: snapshot.isDraggingOver ? "#f0f8ff" : "transparent",
              transition: "background-color 0.2s ease"
            }}
          >
            {/* Only render cards if they exist and are an array */}
            {Array.isArray(cards) && cards.map((card, index) => (
              <ListCard
                key={card.id}
                card={card}
                index={index}
                type={list.type}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {isAddingCard ? (
        <div className="mt-4">
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
            className="p-2 rounded border border-gray-300 w-full mb-2"
          />
          <div className="flex gap-2">
            <Button size="small" onClick={handleAddCardSubmit}>
              Add Card
            </Button>
            <Button size="small" onClick={handleCancelAddCard}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full flex items-center text-gray-600 mt-2 pt-2 border-t border-gray-200">
          <Button
            type="text"
            className="flex items-center gap-2 font-normal"
            onClick={handleAddCardClick}
          >
            <Plus size={16} />
            Add a card
          </Button>
          <div className="ml-auto">
            <Button type="text" size="small" className="text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M4 16L8 12M8 12L4 8M8 12H16M16 12L20 8M16 12L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListComponent;
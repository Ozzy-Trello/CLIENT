import React, { useEffect, useState } from "react";
import { Card } from "@/app/dto/types";
import { DraggableProvided } from "@hello-pangea/dnd";
import { MessageSquare, Paperclip, Calendar, CalendarDays } from "lucide-react";
import { Tag } from "antd";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

interface CardTaskProps {
  card: Card;
  provided: DraggableProvided;
  setOpen: (value: boolean) => void;
}

const CardTask: React.FC<CardTaskProps> = ({ card, provided, setOpen }) => {
  // Get the latest card data from Redux store
  const latestCardData = useSelector(
    (state: RootState) =>
      state.cards.cards.find((c) => c.id === card.id) || card
  );

  // Use local state to track the card data
  const [currentCard, setCurrentCard] = useState<Card>(latestCardData as Card);

  // Update local state when Redux state changes
  useEffect(() => {
    if (latestCardData) {
      setCurrentCard(latestCardData as Card);
    }
  }, [latestCardData]);

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer"
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
      }}
      onClick={() => {
        setOpen(true);
      }}
    >
      {/* Cover image */}
      {currentCard.cover?.url && !currentCard.isNew && (
        <div className="w-full bg-white border-b">
          <div className="relative">
            <img
              src={currentCard.cover.url}
              alt=""
              className="w-full object-contain"
            />
          </div>
        </div>
      )}
      {/* Status color bar */}
      <div className="flex h-1 w-full">
        <div className="bg-green-500 w-1/3"></div>
        <div className="bg-yellow-400 w-1/3"></div>
        <div className="bg-orange-400 w-1/3"></div>
      </div>
      {/* Card content */}
      <div className="p-4">
        {/* Labels and custom field tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {/* Regular labels */}
          {currentCard.labels.map((label, idx) => (
            <Tag key={`label-${idx}`} color={label.color}>
              {label.title}
            </Tag>
          ))}

          {/* Custom fields as tags - only show certain fields as tags */}
          {currentCard.customFields.map((field, idx) => {
            // Skip empty fields or false checkboxes
            if (
              !field.value?.displayValue ||
              (typeof field.value.displayValue === "boolean" &&
                !field.value.displayValue)
            ) {
              return null;
            }

            // Only show specific custom fields as tags
            // Skip fields that are already shown as labels
            if (
              field.name === "Revisi Desain" ||
              field.name === "Terkirim ke DM" ||
              field.name === "Desain ACC"
            ) {
              return null;
            }

            // Determine tag color based on field name
            let color = "default";

            // For boolean fields that are true
            if (
              typeof field.value.displayValue === "boolean" &&
              field.value.displayValue === true
            ) {
              color = "success";
            }

            return (
              <Tag key={`custom-${idx}`} color={color} className="py-0.5">
                {typeof field.value.displayValue === "boolean"
                  ? field.name
                  : field.value.displayValue}
              </Tag>
            );
          })}
        </div>

        {/* Card title */}
        <h3 className="text-blue-800 font-semibold text-lg mb-3">
          {currentCard.title}
        </h3>
        {/* Icons row */}
        <div className="flex items-center gap-4 text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">≡</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare size={16} />
            <span className="text-sm">{currentCard.activity.length || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Paperclip size={16} />
            <span className="text-sm">
              {currentCard.attachments.length || 0}
            </span>
          </div>
        </div>
        {/* <div className="text-green-600 text-sm">Cabang: {currentCard.location}</div> */}
        {/* Custom fields */}
        <div className="space-y-2 mb-">
          {currentCard.customFields.map((item, index) => (
            <div
              key={`${currentCard.id}-field-${index}`}
              className="text-gray-700 text-[11px]"
            >
              <span className="font-medium">{item.name}:</span>{" "}
              {item.value?.displayValue}
            </div>
          ))}
        </div>
        {/* Date information */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="flex items-center gap-1 text-[10px]">
              <Calendar size={12} />
              <span className="text-[10px]">{currentCard.time.inList}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <CalendarDays size={12} />
              <span className="text-[10px]">{currentCard.time.onBoard}</span>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-1">
            <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              P
            </div>
            <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              D
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardTask;

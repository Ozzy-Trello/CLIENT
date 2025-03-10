import React from "react";
import { Card } from "@/app/dto/types";
import { DraggableProvided } from "@hello-pangea/dnd";
import { MessageSquare, Paperclip, Calendar, CalendarDays } from "lucide-react";

interface CardTaskProps {
  card: Card;
  provided: DraggableProvided;
  setOpen: (value: boolean) => void;
}

const CardTask: React.FC<CardTaskProps> = ({ card, provided, setOpen }) => {
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
      {card.cover?.url && (
        <div className="w-full bg-white border-b">
          <div className="relative">
            <img
              src={card.cover.url}
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
        {/* Card title */}
        <h3 className="text-blue-800 font-semibold text-lg mb-3">
          {card.title}
        </h3>
       
        {/* Icons row */}
        <div className="flex items-center gap-4 text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">≡</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare size={16} />
            <span className="text-sm">{card.activity.length || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Paperclip size={16} />
            <span className="text-sm">{card.attachments.length || 0}</span>
          </div>
          <div className="text-green-600 text-sm">
            Cabang: {card.location}
          </div>
        </div>
       
        {/* Custom fields */}
        <div className="space-y-2 mb-">
          {card.customFields.map((item, index) => (
            <div key={`${card.id}-field-${index}`} className="text-gray-700 text-[11px]">
              <span className="font-medium">{item.name}:</span> {item.value?.displayValue}
            </div>
          ))}
        </div>
       
        {/* Date information */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="flex items-center gap-1 text-[10px]">
              <Calendar size={12} />
              <span className="text-[10px]">{card.time.inList}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <CalendarDays size={12} />
              <span className="text-[10px]">{card.time.onBoard}</span>
            </div>
          </div>
         
          {/* Status badges */}
          <div className="flex gap-1">
            <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              DO
            </div>
            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
              CSO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardTask;
import React from "react";
import { Card } from "@/app/dto/types";
import { DraggableProvided } from "@hello-pangea/dnd";
import { Typography } from "antd";

const CardCounter: React.FC<{
  card: Card;
  provided: DraggableProvided;
  setOpen: (value: boolean) => void;
}> = ({ card, provided, setOpen }) => {
  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer bg-gray-300 text-white"
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onClick={() => {
        setOpen(true);
      }}
    >
      <div className="px-6 py-4">
        <h1 className="text-center font-semibold text-white mb-8" style={{color: "white !important", fontSize: "30px"}}>
          <div dangerouslySetInnerHTML={{ __html: card?.description || "0"}}></div>
        </h1>
        <p className="text-xl font-medium">
          {card?.title}
        </p>
      </div>
    </div>
  );
};

export default CardCounter;
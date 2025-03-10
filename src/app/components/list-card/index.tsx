import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card } from "@/app/dto/types";
import "./style.css";
import CardTask from "./card-task";
import CardCounter from "./card-counter";
import ModalCardForm from "../modal-card-form";

interface ListCardProps {
  index: number;
  card: Card;
  type: string;
}

const ListCard: React.FC<ListCardProps> = (props) => {
  const { index, card, type } = props;
  const [open, setOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  
  if (!card) return null;
 
  // Using just the card ID as the draggableId
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided) => (
        <div>
          {type === "filter" ? (
            <CardCounter card={card} provided={provided} setOpen={setOpen}/>
          ) : (
            <CardTask card={card} provided={provided} setOpen={setOpen}/>
          )}
          <ModalCardForm open={open} setOpen={setOpen} loading={loading} card={card} />
        </div>
      )}
    </Draggable>
  );
};

export default ListCard;
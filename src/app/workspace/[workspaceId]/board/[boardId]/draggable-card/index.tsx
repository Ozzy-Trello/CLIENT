import { useCardDetailContext } from "@providers/card-detail-context";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { Draggable } from "@hello-pangea/dnd";
import { CheckboxChangeEvent, CheckboxProps } from "antd";
import { useState } from "react";
import RegularCard from "./regular";
import Dashcard from "./dashcard";
import { usePermissions } from "@hooks/account";
import { useCardDetails } from "@hooks/card-details";
import { useParams } from "next/navigation";

interface DraggableCardProps {
  card: Card;
  index: number;
  list: AnyList;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ card, index, list }) => {
  const { openCardDetail } = useCardDetailContext();
  const { workspaceId, boardId } = useParams();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const { canMove } = usePermissions();
  const { completeCard, incompleteCard } = useCardDetails("", "", boardId as string);

  const onChange = (e: CheckboxChangeEvent, card: Card) => {
    e.stopPropagation();
    const isComplete = e.target.checked;
    if (isComplete) {
      completeCard({listId:card?.listId, cardId: card.id});
    } else {
      incompleteCard({listId:card?.listId, cardId: card.id});
    }
  };

  // Check if user can move cards
  const canMoveCard = canMove("card");

  return (
    <Draggable
      draggableId={card.id}
      index={index}
      isDragDisabled={!canMoveCard}
    >
      {(provided, snapshot) => (
        <div
          className={`bg-white rounded-lg border border-gray-200 
            max-w-sm
          hover:border-blue-500 transition-all duration-300 overflow-hidden
          ${canMoveCard ? "cursor-move" : "cursor-default"}
          ${snapshot.isDragging ? "shadow-lg" : ""}
          `}
          ref={provided.innerRef}
          {...provided.dragHandleProps}
          {...provided.draggableProps}
          onClick={(e) => {
            if (e.target instanceof HTMLElement) {
              if (e.target.className.includes("checkbox")) {
                return;
              }
            }

            openCardDetail(card, list);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title={
            !canMoveCard ? "You don't have permission to move cards" : undefined
          }
        >
          {card.type == EnumCardType.Dashcard ? (
            <Dashcard
              card={card}
              isHovered={isHovered}
              onCompletionChange={onChange}
            />
          ) : (
            <RegularCard
              card={card}
              isHovered={isHovered}
              onCompletionChange={onChange}
            />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default DraggableCard;

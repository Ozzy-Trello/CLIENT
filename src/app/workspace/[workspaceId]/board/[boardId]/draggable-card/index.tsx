import { useCardDetailContext } from "@providers/card-detail-context";
import { useCardFocus } from "@providers/card-focus-context";
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
import CardContextMenu from "@components/card-context-menu";

interface DraggableCardProps {
  card: Card;
  index: number;
  list: AnyList;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ card, index, list }) => {
  const { openCardDetail } = useCardDetailContext();
  const { focusedCardId, setFocusedCardId, isCardFocused, clearFocus } =
    useCardFocus();
  const { workspaceId, boardId } = useParams();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const { canMove } = usePermissions();
  const { completeCard, incompleteCard } = useCardDetails(
    "",
    "",
    boardId as string
  );

  const onChange = (e: CheckboxChangeEvent, card: Card) => {
    e.stopPropagation();
    const isComplete = e.target.checked;
    if (isComplete) {
      completeCard({ listId: card?.listId, cardId: card.id });
    } else {
      incompleteCard({ listId: card?.listId, cardId: card.id });
    }
  };

  // Check if user can move cards
  const canMoveCard = canMove("card");

  // Determine if this card should be blurred
  const shouldBlur = focusedCardId !== null && !isCardFocused(card.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    setFocusedCardId(card.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (e.target.className.includes("checkbox")) {
        return;
      }
    }

    openCardDetail(card, list);
  };

  return (
    <Draggable
      draggableId={card.id}
      index={index}
      isDragDisabled={!canMoveCard}
    >
      {(provided, snapshot) => (
        <CardContextMenu
          onContextMenu={handleContextMenu}
          card={card}
          list={list}
        >
          <div
            className={`bg-white rounded-lg border border-gray-200 
              max-w-sm
            hover:border-blue-500 overflow-hidden
            ${snapshot.isDragging ? "shadow-lg" : ""}
            ${canMoveCard ? "cursor-move" : "cursor-default"}
            ${shouldBlur ? "opacity-30 blur-sm" : ""}
            ${isCardFocused(card.id) ? "ring-2 ring-blue-500 shadow-lg" : ""}
            `}
            ref={provided.innerRef}
            {...provided.dragHandleProps}
            {...provided.draggableProps}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            data-card-id={card.id}
            title={
              !canMoveCard
                ? "You don't have permission to move cards"
                : undefined
            }
          >
            {card.type == EnumCardType.Dashcard ? (
              <Dashcard
                card={card}
                isHovered={isHovered}
                onCompletionChange={onChange}
                isDragging={snapshot.isDragging}
              />
            ) : (
              <RegularCard
                card={card}
                isHovered={isHovered}
                onCompletionChange={onChange}
                isDragging={snapshot.isDragging}
              />
            )}
          </div>
        </CardContextMenu>
      )}
    </Draggable>
  );
};

export default DraggableCard;

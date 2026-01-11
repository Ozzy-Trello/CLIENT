import { useCardDetailContext } from "@providers/card-detail-context";
import { useCardFocus } from "@providers/card-focus-context";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { Draggable } from "@hello-pangea/dnd";
import { CheckboxChangeEvent } from "antd";
import { memo, useState } from "react";
import RegularCard from "./regular";
import Dashcard from "./dashcard";
import { usePermissions } from "@hooks/account";
import { useCardDetails } from "@hooks/card-details";
import { useParams } from "next/navigation";
import CardContextMenu from "@components/card-context-menu";
import { MoreHorizontal } from "lucide-react";

interface DraggableCardProps {
  card: Card;
  index: number;
  list: AnyList;
  compactMode?: boolean;
}

const DraggableCardComponent: React.FC<DraggableCardProps> = ({
  card,
  index,
  list,
  compactMode = false,
}) => {
  const { openCardDetail } = useCardDetailContext();
  const { focusedCardId, setFocusedCardId, isCardFocused } = useCardFocus();
  const { boardId } = useParams();
  const [isHovered, setIsHovered] = useState<boolean>(false);
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

  const handleClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (
        e.target.className.includes("checkbox") ||
        e.target.closest(".more-options-btn")
      ) {
        return;
      }
    }

    openCardDetail(card, list);
  };

  const handleMoreOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setFocusedCardId(card.id);

    // Dispatch a synthetic contextmenu event on the card container
    const cardContainer = e.currentTarget.closest(".draggable-card-container");
    if (cardContainer) {
      const syntheticEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      cardContainer.dispatchEvent(syntheticEvent);
    }
  };

  return (
    <Draggable
      draggableId={card.id}
      index={index}
      isDragDisabled={!canMoveCard}
    >
      {(provided, snapshot) => (
        <CardContextMenu card={card} list={list}>
          <div
            className={`bg-white rounded-lg border border-gray-200 
              w-full draggable-card-container relative group
            hover:border-blue-500 overflow-hidden transition-all duration-200
            ${snapshot.isDragging ? "" : ""}
            ${canMoveCard ? "cursor-pointer" : "cursor-default"}
            ${shouldBlur ? "opacity-30 blur-sm" : ""}
            ${isCardFocused(card.id) ? "ring-2 ring-blue-500 shadow-lg" : ""}
            `}
            ref={provided.innerRef}
            {...provided.dragHandleProps}
            {...provided.draggableProps}
            style={{
              ...provided.draggableProps.style,
            }}
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
                boardId={boardId as string | undefined}
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
                compactMode={compactMode}
              />
            )}

            {/* Removed drag handle indicator (9 dots) for a cleaner UI */}

            {/* More options button - visible on all devices */}
            <button
              className="more-options-btn"
              onClick={handleMoreOptions}
              aria-label="More options"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </CardContextMenu>
      )}
    </Draggable>
  );
};

export default memo(DraggableCardComponent);

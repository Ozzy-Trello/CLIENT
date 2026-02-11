import { useCardDetailContext } from "@providers/card-detail-context";
import { useCardFocus } from "@providers/card-focus-context";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { Draggable } from "@hello-pangea/dnd";
import { CheckboxChangeEvent } from "antd";
import { useState } from "react";
import RegularCard from "./regular";
import Dashcard from "./dashcard";
import { usePermissions } from "@hooks/account";
import { useCardDetails } from "@hooks/card-details";
import { useParams } from "next/navigation";
import CardContextMenu from "@components/card-context-menu";
import { MoreHorizontal } from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@store/workspace_slice";
import { selectUser } from "@store/app_slice";

interface DraggableCardProps {
  card: Card;
  index: number;
  list: AnyList;
}

const BLOCKED_CARD_DRAG_BOARD_NAMES = new Set([
  "dateline",
  "delivery",
  "list po | outlet",
  "request desain | outlet",
  "list purchase | umum",
  "list purchase | produksi",
  // keep alias without pipe for existing legacy board names
  "list purchase produksi",
  "komplain",
  "krah manset | produksi",
  "konfirm desain | bordir",
  "general affair",
]);

const normalizeName = (name?: string) => (name || "").trim().toLowerCase();

const DraggableCard: React.FC<DraggableCardProps> = ({ card, index, list }) => {
  const { openCardDetail } = useCardDetailContext();
  const { focusedCardId, setFocusedCardId, isCardFocused } = useCardFocus();
  const { boardId } = useParams();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { isSuperAdmin } = usePermissions();
  const currentBoard = useSelector(selectCurrentBoard);
  const currentUser = useSelector(selectUser);
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

  // Check if user can move cards + hardcoded disabled boards
  const boardName =
    currentBoard?.name || card.boardName || (list as any)?.boardName || "";
  const isBlockedBoard = BLOCKED_CARD_DRAG_BOARD_NAMES.has(
    normalizeName(boardName)
  );
  const roleName = (currentUser?.role?.name || "").trim().toLowerCase();
  const isObserver = roleName === "observer";
  const canMoveCard = !isObserver && (isSuperAdmin() || !isBlockedBoard);

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
            title={undefined}
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

export default DraggableCard;

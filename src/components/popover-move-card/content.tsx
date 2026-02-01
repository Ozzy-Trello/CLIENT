import React, { useRef, useState } from "react";
import { Button, message } from "antd";
import { BoardSelection, ListSelection, SelectionRef } from "../selection";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCards } from "@hooks/card";
import { useParams } from "next/navigation";
import { Card } from "@myTypes/card";
import { AnyList } from "@myTypes/list";

interface ContentMoveCardProps {
  card?: Card;
  list?: AnyList;
  onClose?: () => void;
}

const ContentMoveCard: React.FC<ContentMoveCardProps> = ({
  card: propCard,
  list: propList,
  onClose,
}) => {
  const { boardId } = useParams();
  const { selectedCard, closeCardDetail } = useCardDetailContext();

  // Use prop card if available, otherwise fall back to context card
  const currentCard = propCard || selectedCard;
  const currentList = propList;

  const [selectedBoard, setSelectedBoard] = useState<string>(boardId as string);
  const [selectedList, setSelectedList] = useState<string>("");

  const listSelectionRef = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);

  // Handle board change - clear list selection when board changes
  const handleBoardChange = (boardId: string) => {
    console.log(boardId, "<< ini boardid");
    setSelectedBoard(boardId);
    // Clear the list selection when board changes
    setSelectedList("");
    // Also clear the list selection ref if it exists
    if (listSelectionRef.current) {
      listSelectionRef.current.setValue("");
    }
  };

  const { updateCard } = useCards(
    currentCard?.listId || "",
    Array.isArray(boardId) ? boardId[0] : boardId || ""
  );

  const handleMove = () => {
    if (!currentCard || !selectedList) return;

    updateCard({
      cardId: currentCard.id,
      updates: { listId: selectedList },
      listId: currentCard.listId,
      destinationListId: selectedList,
    });

    // Close the popover
    if (onClose) {
      onClose();
    }

    // Show success message
    message.success("Card moved successfully!");

    if (selectedCard) {
      closeCardDetail(); // Only close card detail modal if it was opened from context
    }
  };

  return (
    <div className="py-2 max-w-full text-sm text-gray-800">
      <div className="space-y-4">
        <p className="text-gray-600 font-medium">Move to</p>

        {/* Board Selection */}
        <div>
          <label className="block mb-1">Board</label>
          <BoardSelection
            width="100%"
            ref={boardSelectionRef}
            value={selectedBoard}
            onChange={handleBoardChange}
            size="small"
            placeholder="Select board"
          />
        </div>

        {/* List - only show when board is selected */}
        {selectedBoard && (
          <div>
            <label className="block mb-1">List</label>
            <ListSelection
              ref={listSelectionRef}
              size="small"
              width="100%"
              value={selectedList}
              onChange={setSelectedList}
              boardIdProp={selectedBoard}
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="primary"
            onClick={handleMove}
            disabled={!selectedBoard || !selectedList}
            className="bg-blue-600 hover:bg-blue-700 w-full h-9 text-sm"
          >
            Move
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContentMoveCard;

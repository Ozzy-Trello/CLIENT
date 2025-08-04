import React, { useRef, useState } from 'react';
import { Button, message } from 'antd';
import {
  BoardSelection,
  ListSelection,
  SelectionRef
} from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useCards } from '@hooks/card';
import { useParams } from 'next/navigation';
import { Card } from '@myTypes/card';
import { AnyList } from '@myTypes/list';

interface ContentMoveCardProps {
  card?: Card;
  list?: AnyList;
  onClose?: () => void;
}

const ContentMoveCard: React.FC<ContentMoveCardProps> = ({ card: propCard, list: propList, onClose }) => {
  const { boardId } = useParams();
  const {
    selectedCard,
    closeCardDetail
  } = useCardDetailContext();

  // Use prop card if available, otherwise fall back to context card
  const currentCard = propCard || selectedCard;
  const currentList = propList;

  const [selectedBoard, setSelectedBoard] = useState<string>(boardId as string);
  const [selectedList, setSelectedList] = useState<string>(currentCard?.listId || '');

  const listSelectionRef = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);

  const { updateCard } = useCards(
    currentCard?.listId || '',
    Array.isArray(boardId) ? boardId[0] : boardId || ''
  );

  const handleMove = () => {
    if (!currentCard || !selectedList) return;
    
    updateCard({
      cardId: currentCard.id,
      updates: { listId: selectedList },
      listId: currentCard.listId,
      destinationListId: selectedList
    });
    
    // Close the popover
    if (onClose) {
      onClose();
    }
    
    // Show success message
    message.success('Card moved successfully!');
    
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
            onChange={setSelectedBoard}
            size="small"
            placeholder="Select board"
          />
        </div>

        {/* List */}
        <div>
          <label className="block mb-1">List</label>
          <ListSelection
            ref={listSelectionRef}
            size="small"
            width="100%"
            value={selectedList}
            onChange={setSelectedList}
            selectedBoardId={selectedBoard}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="primary"
            onClick={handleMove}
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

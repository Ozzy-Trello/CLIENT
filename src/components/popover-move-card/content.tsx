import React, { useRef, useState } from 'react';
import { Button } from 'antd';
import {
  BoardSelection,
  CardPositionSelection,
  ListSelection,
  SelectionRef
} from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useCards } from '@hooks/card';
import { useParams } from 'next/navigation';

const ContentMoveCard: React.FC = () => {
  const { boardId } = useParams();
  const {
    selectedCard,
    closeCardDetail
  } = useCardDetailContext();

  const [selectedBoard, setSelectedBoard] = useState<string>(boardId as string);
  const [selectedList, setSelectedList] = useState<string>(selectedCard?.listId || '');
  const [selectedPosition, setSelectedPosition] = useState<number>(1);

  const listSelectionRef = useRef<SelectionRef>(null);
  const positionSelectionRef = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);

  const { updateCard } = useCards(
    selectedCard?.listId || '',
    Array.isArray(boardId) ? boardId[0] : boardId || ''
  );

  const positionOptions = [{ value: 1, label: '1' }];

  const handleMove = () => {
    if (!selectedCard || !selectedList) return;
    updateCard({
      cardId: selectedCard.id,
      updates: { listId: selectedList },
      listId: selectedCard.listId,
      destinationListId: selectedList
    });
    closeCardDetail(); // Optional: Close the card detail modal after move
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

        {/* List + Position */}
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block mb-1">Position</label>
            <CardPositionSelection
              className="w-full"
              value={selectedPosition}
              onChange={(val:any) => setSelectedPosition(parseInt(val))}
              options={positionOptions}
              ref={positionSelectionRef}
              listId={selectedList}
              selectedListId={selectedList}
              size="small"
              width="100%"
            />
          </div>
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

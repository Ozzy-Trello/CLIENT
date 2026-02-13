import React, { useRef, useState } from 'react';
import { Button } from 'antd';
import {
  BoardSelection,
  CardPositionSelection,
  ListSelection,
  SelectionRef
} from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useMirrorCard } from '@hooks/card';
import { useParams } from 'next/navigation';

const ContentMirrorCard: React.FC = () => {
  const { boardId } = useParams();
  const {
    selectedCard,
    closeCardDetail
  } = useCardDetailContext();

  const [selectedBoard, setSelectedBoard] = useState<string>(
    boardId as string
  );
  const [selectedList, setSelectedList] = useState<string>(
    selectedCard?.listId || ''
  );
  const [selectedPosition, setSelectedPosition] = useState<number>(1);

  const listSelectionRef = useRef<SelectionRef>(null);
  const positionSelectionRef = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);

  const { mirrorCard } = useMirrorCard();

  const positionOptions = [{ value: 1, label: '1' }];

  const handleBoardChange = (boardId: string) => {
    setSelectedBoard(boardId);
    setSelectedList('');
    if (listSelectionRef.current) {
      listSelectionRef.current.setValue('');
    }
  };

  const handleMirror = () => {
    if (selectedCard && selectedList) {
      mirrorCard({
        boardId: boardId as string,
        id: selectedCard.id,
        targetListId: selectedList,
        targetPosition: selectedPosition
      });
      closeCardDetail(); // Optional: auto-close modal
    }
  };

  return (
    <div className="py-2 max-w-full text-sm text-gray-800">
      <div className="space-y-4">
        {/* Destination label */}
        <p className="text-gray-600 font-medium">Select Destination</p>

        {/* Board selection */}
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

        {/* List and Position */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Mirror button */}
        <div className="pt-4">
          <Button
            type="primary"
            onClick={handleMirror}
            className="bg-blue-600 hover:bg-blue-700 w-full h-9 text-sm"
          >
            Mirror Card
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContentMirrorCard;

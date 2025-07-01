import React, { useRef, useState } from 'react';
import { Modal, Select, Button } from 'antd';
import { X } from 'lucide-react';
import { BoardSelection, CardPositionSelection, ListSelection, SelectionRef } from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useCards } from '@hooks/card';
import { useParams } from 'next/navigation';


const ContentMoveCard: React.FC = () => {
  const { boardId } = useParams();
  const {selectedCard, setSelectedCard,  isCardDetailOpen, openCardDetail, closeCardDetail } = useCardDetailContext();
  const [selectedBoard, setSelectedBoard] = useState<string>(boardId as string);
  const [selectedList, setSelectedList] = useState<string>(selectedCard?.listId || "");
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const listSelectionRef = useRef<SelectionRef>(null);
  const positionSelectionref = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);
  const { updateCard } = useCards(selectedCard?.listId || '', Array.isArray(boardId) ? boardId[0] : boardId || '');

  const positionOptions = [
    { value: 1, label: '1' },
  ];

  const onMove = () => {

  }

  const onClose = () => {

  }

  const handleMove = () => {
    if (selectedCard) {
      updateCard({
        cardId: selectedCard?.id,
        updates: { 
          listId: selectedList
        },
        listId: selectedCard?.listId,
        destinationListId: selectedList
      });
    }
  };

  const onListChange = (value: string, option: object) => {
    setSelectedList(value);
  }
  
  const onBoardChange = (value: string, option: object) => {
    setSelectedBoard(value);
  } 
  
  const onPositionChange = (value: string, option: object) => {
    setSelectedPosition(parseInt(value));
  } 

  return (
    <div className="py-2">
      <p className="text-gray-700 mb-4">Select destination</p>
      
      <div className="mb-4">
        <h3 className="text-gray-800 font-medium mb-2">Board</h3>
          <BoardSelection
            width={"fit-content"}
            ref={boardSelectionRef}
            value={selectedBoard}
            onChange={onBoardChange}
            className="mx-2"
            placeholder={"board"}
            key={`board-selection`}
          />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-gray-800 font-medium mb-2">List</h3>
          <ListSelection 
            ref={listSelectionRef} 
            size="small" 
            width={"fit-content"} 
            value={selectedList}
            onChange={onListChange}
            selectedBoardId={selectedBoard}
          />
        </div>
        
        <div>
          <h3 className="text-gray-800 font-medium mb-2">Position</h3>
           <CardPositionSelection
              className="w-full"
              value={selectedPosition}
              onChange={onPositionChange}
              options={positionOptions}
              ref={positionSelectionref}
              listId={selectedList}
              selectedListId={selectedList}
              size="small"
              width="100px"
            />
        </div>
      </div>
      
      <Button
        type="primary"
        onClick={handleMove}
        className="bg-blue-600 hover:bg-blue-700 h-10"
      >
        Move
      </Button>
    </div>
  );
};

export default ContentMoveCard;
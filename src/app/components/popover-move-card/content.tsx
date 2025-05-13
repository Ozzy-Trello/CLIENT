import React, { useRef, useState } from 'react';
import { Modal, Select, Button } from 'antd';
import { X } from 'lucide-react';
import { ListSelection, SelectionRef } from '../selection';
import { useCardDetailContext } from '@/app/provider/card-detail-context';
import { useCards } from '@/app/hooks/card';
import { useParams } from 'next/navigation';


const ContentMoveCard: React.FC = () => {
  const {selectedCard, setSelectedCard,  isCardDetailOpen, openCardDetail, closeCardDetail } = useCardDetailContext();
  const [selectedBoard, setSelectedBoard] = useState<string>("board1");
  const [selectedList, setSelectedList] = useState<string>(selectedCard?.listId || "");
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const listSelectionRef = useRef<SelectionRef>(null);
  const { boardId } = useParams();
  const { updateCard } = useCards(selectedCard?.listId || '', Array.isArray(boardId) ? boardId[0] : boardId || '');
  

  const boardOptions = [
    { value: 'board1', label: '4.7 Request Desain | Outlet' },
  ];

  const listOptions = [
    { value: 'list1', label: 'Filter Desain Terhandle' },
  ];

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
    console.log("List changed to: ", value, option);
    setSelectedList(value);
  } 
  

  return (
    <div className="py-2">
      <p className="text-gray-700 mb-4">Select destination</p>
      
      <div className="mb-4">
        <h3 className="text-gray-800 font-medium mb-2">Board</h3>
        <Select
          className="w-full"
          value={selectedBoard}
          onChange={setSelectedBoard}
          options={boardOptions}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-gray-800 font-medium mb-2">List</h3>
          <ListSelection 
            ref={listSelectionRef} 
            size="small" 
            width={"fit-content"} 
            value={selectedCard?.listId}
            onChange={onListChange}
          />
        </div>
        
        <div>
          <h3 className="text-gray-800 font-medium mb-2">Position</h3>
          <Select
            className="w-full"
            value={selectedPosition}
            onChange={setSelectedPosition}
            options={positionOptions}
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
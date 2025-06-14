import React, { useRef, useState } from 'react';
import { Select, Button, Input } from 'antd';
import { CardPositionSelection, ListSelection, SelectionRef } from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useCardCopy, useCards } from '@hooks/card';
import { useParams } from 'next/navigation';
import { Card, CopycardPost } from '@myTypes/card';
import { EnumOptionPosition } from '@myTypes/options';


const ContentCopyCard: React.FC = () => {
  const {selectedCard, setSelectedCard,  isCardDetailOpen, openCardDetail, closeCardDetail } = useCardDetailContext();
  const [selectedBoard, setSelectedBoard] = useState<string>("board1");
  const [selectedList, setSelectedList] = useState<string>(selectedCard?.listId || "");
  const [selectedPosition, setSelectedPosition] = useState<string>("1");
  const listSelectionRef = useRef<SelectionRef>(null);
  const positionSelectionref = useRef<SelectionRef>(null);
  const { boardId } = useParams();
  const [ cardName, setCardName ] = useState<string>(selectedCard?.name || "");
  const { addCard } = useCards(selectedCard?.listId || '', Array.isArray(boardId) ? boardId[0] : boardId || '');
  const { copyCard } = useCardCopy();

  

  const boardOptions = [
    { value: 'board1', label: '4.7 Request Desain | Outlet' },
  ];

  const positionOptions = [
    { value: 1, label: '1' },
  ];


  const handleCopy = () => {
    if (selectedCard && selectedList) {
      let cardToCopy: CopycardPost = {
        cardId: selectedCard?.id,
        name: cardName,
        targetListId: selectedList || "",
        isWithLabels: true,
        isWithlabels: true,
        isWithMembers: true,
        isWithAttachments: true,
        isWtihCustomFields: true,
        isWithComments: true,
        isWithChecklist: true,
        position: EnumOptionPosition.TopOfList
      }
      copyCard({
        boardId: "",
        cardId: selectedCard?.id,
        cardCopyData: cardToCopy
      });
    }
  };

  const onListChange = (value: string, option: object) => {
    console.log("List changed to: ", value, option);
    setSelectedList(value);
  } 
  

  return (
    <div className="py-2">
      <div className="mb-4">
        <h3 className="text-gray-800 font-medium mb-1">Name</h3>
        <Input
          size="large"
          className="rounded"
          value={cardName}
          onChange={(e) => {setCardName(e.target.value);}}
        />
      </div>
      
      <p className="text-gray-700 mb-2 font-bold">Select destination</p>
      
      <div className="mb-2">
        <h3 className="text-gray-800 font-medium mb-1">Board</h3>
        <Select
          className="w-full"
          value={selectedBoard}
          onChange={setSelectedBoard}
          options={boardOptions}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <h3 className="text-gray-800 font-medium mb-1">List</h3>
          <ListSelection 
            ref={listSelectionRef} 
            size="small" 
            width={"fit-content"} 
            value={selectedCard?.listId}
            onChange={onListChange}
          />
        </div>
        
        <div>
          <h3 className="text-gray-800 font-medium mb-1">Position</h3>
          <CardPositionSelection
            className="w-full"
            value={selectedPosition}
            onChange={setSelectedPosition}
            options={positionOptions}
            ref={positionSelectionref}
            listId={listSelectionRef.current?.getValue()}
            size="small"
            width="100px"
          />
        </div>
      </div>
      
      <Button
        type="primary"
        onClick={handleCopy}
        className="bg-blue-600 hover:bg-blue-700 h-10"
      >
        Copy
      </Button>
    </div>
  );
};

export default ContentCopyCard;
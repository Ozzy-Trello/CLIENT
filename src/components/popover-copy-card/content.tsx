import React, { useRef, useState } from 'react';
import { Select, Button, Input, Checkbox, message } from 'antd';
import {
  BoardSelection,
  ListSelection,
  SelectionRef
} from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useCardCopy, useCards } from '@hooks/card';
import { useParams } from 'next/navigation';
import { CopycardPost, Card } from '@myTypes/card';
import { AnyList } from '@myTypes/list';

interface CopyEntitiesOption {
  withChecklists: boolean;
  withLabels: boolean;
  withMembers: boolean;
  withAttachments: boolean;
  withComments: boolean;
  withCustomFields: boolean;
}

interface ContentCopyCardProps {
  card?: Card;
  list?: AnyList;
  onClose?: () => void;
}

const ContentCopyCard: React.FC<ContentCopyCardProps> = ({ card: propCard, list: propList, onClose }) => {
  const { boardId } = useParams();
  const {
    selectedCard,
    closeCardDetail
  } = useCardDetailContext();

  // Use prop card if available, otherwise fall back to context card
  const currentCard = propCard || selectedCard;
  const currentList = propList;

  const [selectedBoard, setSelectedBoard] = useState<string>(
    boardId as string
  );
  const [selectedList, setSelectedList] = useState<string>(
    currentCard?.listId || ''
  );
  const listSelectionRef = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);
  const [cardName, setCardName] = useState<string>(
    currentCard?.name || ''
  );

  const { copyCard } = useCardCopy();

  const [copyEntitiesOption, setEntitiesOption] = useState<CopyEntitiesOption>(
    {
      withChecklists: true,
      withLabels: true,
      withMembers: true,
      withAttachments: true,
      withComments: true,
      withCustomFields: true
    }
  );

  const handleBoardChange = (boardId: string) => {
    setSelectedBoard(boardId);
    setSelectedList("");
    if (listSelectionRef.current) {
      listSelectionRef.current.setValue("");
    }
  };

  const handleCopy = () => {
    if (currentCard && selectedList) {
      const cardToCopy: CopycardPost = {
        cardId: currentCard.id,
        name: cardName,
        targetListId: selectedList,
        withChecklists: copyEntitiesOption.withChecklists,
        withLabels: copyEntitiesOption.withLabels,
        withMembers: copyEntitiesOption.withMembers,
        withAttachments: copyEntitiesOption.withAttachments,
        withComments: copyEntitiesOption.withComments,
        withCustomFields: copyEntitiesOption.withCustomFields
      };

      copyCard({
        boardId: selectedBoard,
        cardId: currentCard.id,
        cardCopyData: cardToCopy
      });

      // Close the popover
      if (onClose) {
        onClose();
      }
      
      // Show success message
      message.success('Card copied successfully!');

      if (selectedCard) {
        closeCardDetail(); // Only close card detail modal if it was opened from context
      }
    }
  };

  const toggleOption = (key: keyof CopyEntitiesOption) => {
    setEntitiesOption((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="py-2 max-w-full text-sm text-gray-800">
      <div className="space-y-4">
        {/* Name input */}
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <Input
            size="small"
            className="rounded"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
        </div>

        {/* Keep options */}
        <div>
          <label className="block mb-1 text-gray-600 font-medium">Keep</label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(copyEntitiesOption).map(([key, checked]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-gray-700 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onChange={() => toggleOption(key as keyof CopyEntitiesOption)}
                />
                <span className="capitalize">
                  {key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Destination selection */}
        <div>
          <label className="block mb-1 text-gray-600 font-medium">
            Select Destination
          </label>

          <div className="space-y-3">
            {/* Board */}
            <div>
              <label className="block mb-1">Board</label>
              <BoardSelection
                width="100%"
                ref={boardSelectionRef}
                value={selectedBoard}
                onChange={(val:any) => handleBoardChange(val)}
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
                onChange={(val:any) => setSelectedList(val)}
                boardIdProp={selectedBoard}
              />
            </div>
          </div>
        </div>

        {/* Copy Button */}
        <div className="pt-4">
          <Button
            type="primary"
            onClick={handleCopy}
            className="bg-blue-600 hover:bg-blue-700 w-full h-9 text-sm"
          >
            Copy Card
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContentCopyCard;

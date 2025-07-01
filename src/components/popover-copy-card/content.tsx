import React, { useRef, useState } from 'react';
import { Select, Button, Input, Checkbox } from 'antd';
import {
  BoardSelection,
  CardPositionSelection,
  ListSelection,
  SelectionRef
} from '../selection';
import { useCardDetailContext } from '@providers/card-detail-context';
import { useCardCopy, useCards } from '@hooks/card';
import { useParams } from 'next/navigation';
import { CopycardPost } from '@myTypes/card';
import { EnumOptionPosition } from '@myTypes/options';

interface CopyEntitiesOption {
  withChecklists: boolean;
  withLabels: boolean;
  withMembers: boolean;
  withAttachments: boolean;
  withComments: boolean;
  withCustomFields: boolean;
}

const ContentCopyCard: React.FC = () => {
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
  const [cardName, setCardName] = useState<string>(
    selectedCard?.name || ''
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

  const positionOptions = [{ value: 1, label: '1' }];

  const handleCopy = () => {
    if (selectedCard && selectedList) {
      const cardToCopy: CopycardPost = {
        cardId: selectedCard.id,
        name: cardName,
        targetListId: selectedList,
        withChecklists: copyEntitiesOption.withChecklists,
        withLabels: copyEntitiesOption.withLabels,
        withMembers: copyEntitiesOption.withMembers,
        withAttachments: copyEntitiesOption.withAttachments,
        withComments: copyEntitiesOption.withComments,
        withCustomFields: copyEntitiesOption.withCustomFields,
        position: EnumOptionPosition.TopOfList
      };

      copyCard({
        boardId: selectedBoard,
        cardId: selectedCard.id,
        cardCopyData: cardToCopy
      });

      closeCardDetail(); // Optional: auto-close modal
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
                onChange={(val:any) => setSelectedBoard(val)}
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
                  onChange={(val:any) => setSelectedList(val)}
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
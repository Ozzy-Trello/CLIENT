import { Card, EnumCardType } from "@myTypes/card";
import { generateId } from "@utils/general";
import { Button } from "antd";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AddCardProps {
  listId: string;
  addCard: ({ card, listId }: { card: Partial<Card>; listId: string }) => void;
}
const AddCard: React.FC<AddCardProps> = ({listId, addCard}) => {
  const [ isAddingCard, setIsAddingCard ] = useState<boolean>(false);
  const [ newCardName, setNewCardName ] = useState<string>("");
  const columnRef = useRef<HTMLDivElement | null>(null);
  
  const handleAddCardClick = (): void => {
    setIsAddingCard(true);
  };

  const handleCancelAddCard = (): void => {
    setIsAddingCard(false);
    setNewCardName("");
  };

  const handleAddCardChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewCardName(e.target.value);
  }

  const handleAddCardSubmit = (): void => {
    const trimmedContent = newCardName.trim();
    if (trimmedContent && listId) {
      const newCard: Card = {
        id: generateId(),
        listId: listId,
        name: trimmedContent,
        type: EnumCardType.Regular
      };
      addCard({ card: newCard, listId: listId });
      setNewCardName("");
      setIsAddingCard(false);
    }
  }

  const handleClickOutside = (e: MouseEvent): void => {
    if (columnRef.current && !columnRef.current.contains(e.target as Node)) {
      if (isAddingCard) {
        handleCancelAddCard();
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddingCard])

  return (
  <>
    {isAddingCard ? (
    <div ref={columnRef}>
      <input
        type="text"
        placeholder="Enter card content"
        value={newCardName}
        onChange={handleAddCardChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAddCardSubmit();
          } else if (e.key === "Escape") {
            handleCancelAddCard();
          }
        }}
        className="p-2 rounded border border-gray-300 w-full mb-2"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="small" onClick={handleAddCardSubmit}>
          Add Card
        </Button>
        <Button size="small" onClick={handleCancelAddCard}>
          Cancel
        </Button>
      </div>
    </div>
    ) : (
      <div className="w-full flex items-center text-gray-600">
        <Button
          type="text"
          className="flex items-center gap-2 font-normal"
          onClick={handleAddCardClick}
        >
          <Plus size={16} />
          Add a card
        </Button>
        <div className="ml-auto">
          <Button type="text" size="small" className="text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 16L8 12M8 12L4 8M8 12H16M16 12L20 8M16 12L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        </div>
      </div>
    )}
  </>
  );
}

export default AddCard;
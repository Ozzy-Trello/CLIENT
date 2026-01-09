import { Card, EnumAttachmentType, EnumCardAttachmentType, EnumCardType } from "@myTypes/card";
import { generateId } from "@utils/general";
import { Button, message } from "antd";
import { Plus } from "lucide-react";
import { ClipboardEvent, useEffect, useRef, useState } from "react";
import { uploadFile } from "@api/file";
import { createCardAttachment } from "@api/card_attachment";
import { UseMutateAsyncFunction } from "@tanstack/react-query";

interface AddCardProps {
  listId: string;
  addCard: ({ card, listId }: { card: Partial<Card>; listId: string }) => void;
  addCardAsync?: UseMutateAsyncFunction<any, unknown, { card: Partial<Card>; listId: string }, unknown>;
}
const AddCard: React.FC<AddCardProps> = ({ listId, addCard, addCardAsync }) => {
  const [isAddingCard, setIsAddingCard] = useState<boolean>(false);
  const [newCardName, setNewCardName] = useState<string>("");
  const columnRef = useRef<HTMLDivElement | null>(null);

  const handleAddCardClick = (): void => {
    setIsAddingCard(true);
  };

  const handleCancelAddCard = (): void => {
    setIsAddingCard(false);
    setNewCardName("");
  };

  const handleAddCardChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setNewCardName(e.target.value);
  };

  const handleAddCardSubmit = (): void => {
    const trimmedContent = newCardName.trim();
    if (trimmedContent && listId) {
      const newCard: Card = {
        id: generateId(),
        listId: listId,
        name: trimmedContent,
        type: EnumCardType.Regular,
      };
      addCard({ card: newCard, listId: listId });
      setNewCardName("");
      setIsAddingCard(false);
    }
  };

  const handleFileAttachment = async (file: File) => {
    if (!listId || !addCardAsync) {
      message.warning("File paste is not available right now.");
      return;
    }
    const cardPayload: Card = {
      id: generateId(),
      listId: listId,
      name: file.name,
      type: EnumCardType.Regular,
    };

    try {
      const response = await addCardAsync({ card: cardPayload, listId });
      const createdCard = response?.data?.data;
      if (createdCard?.id) {
        const uploadResult = await uploadFile(file, { cardId: createdCard.id });
        const fileData = uploadResult?.data;
        const fileId = fileData?.id ?? (fileData as any)?.id;
        if (fileId) {
          await createCardAttachment({
            cardId: createdCard.id,
            attachableType: EnumAttachmentType.File,
            attachableId: fileId,
            isCover: false,
            type: EnumCardAttachmentType.Attachment,
          });
        }
      }
      message.success("Card created with attachment");
    } catch (error) {
      console.error("Failed to create card from file:", error);
      message.error("Failed to create card from pasted file");
    } finally {
      setIsAddingCard(false);
      setNewCardName("");
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const clipboardItems = e.clipboardData?.files;
    if (!clipboardItems || clipboardItems.length === 0) return;
    const file = clipboardItems[0];
    e.preventDefault();
    handleFileAttachment(file);
  };

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
  }, [isAddingCard]);

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
            onPaste={handlePaste}
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
          {/* <div className="ml-auto">
          <Button type="text" size="small" className="text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 16L8 12M8 12L4 8M8 12H16M16 12L20 8M16 12L20 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        </div> */}
        </div>
      )}
    </>
  );
};

export default AddCard;

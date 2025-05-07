import RichTextEditor from "@/app/components/rich-text-editor";
import { useCards } from "@/app/hooks/card";
import { Card } from "@/app/types/card";
import { Button, Typography } from "antd";
import { AlignLeft, Edit } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

const Description: React.FC<{card: Card, setSelectedCard: Dispatch<SetStateAction<Card | null>>}> = ({card, setSelectedCard}) => {

  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [newDescription, setNewDescription] = useState<string>(card?.description || "");
  const {updateCard} = useCards(card.listId);

  const enableEditDescription = () => {
    setIsEditingDescription(true);
  };

  const disableEditDescription = () => {
    setIsEditingDescription(false);
  };

  const handleSaveDescriptionClick = () => {
    console.log("Saving description:", newDescription);
    updateCard({
      cardId: card.id,
      updates: { 
        description: newDescription,
      },
      listId: card.listId,
      destinationListId: card.listId,
    }, {
      onSuccess: (data) => {
        console.log("Description update successful:", data);
        if (setSelectedCard) {
          setSelectedCard({
            ...card,
            description: newDescription
          });
        }
      },
    });
    setIsEditingDescription(false);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <AlignLeft size={18} />
          <h1 className="text-5xl font-bold mb-0">Description</h1>
        </div>
        {!isEditingDescription && (
          <Button 
            icon={<Edit size={14}/>}
            type="text" 
            size="small" 
            onClick={enableEditDescription} 
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md"
          >
            Edit
          </Button>
        )}
      </div>
      
      {isEditingDescription ? (
        <div className="border rounded-md overflow-hidden ml-8">
          <RichTextEditor
            initialValue={newDescription}
            onChange={(content: string) => {
              setNewDescription(content);
            }}
            placeholder="Add a more detailed description..."
            className="w-full"
          />
          <div className="flex justify-end p-2 bg-gray-50 border-t">
            <Button 
              onClick={disableEditDescription} 
              size="middle" 
              className="mr-2 rounded-md"
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handleSaveDescriptionClick} 
              size="middle" 
              className="rounded-md bg-blue-600 hover:bg-blue-700"
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="ml-8 p-3 bg-gray-50 rounded-md min-h-20 cursor-pointer hover:bg-gray-100 transition-colors" 
          onClick={enableEditDescription}
        >
          {card.description ? (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: newDescription }} />
          ) : (
            <span className="text-gray-400">Add a more detailed description...</span>
          )}
        </div>
      )}
    </div>
  )
}

export default Description;
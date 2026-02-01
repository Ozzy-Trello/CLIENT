import CardAttachmentImageListModal from "@components/modal-list-card-attachment-images";
import RichTextEditor from "@components/rich-text-editor";
import { useCards } from "@hooks/card";
import { Card } from "@myTypes/card";
import { Button, Typography } from "antd";
import { AlignLeft, Edit } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectTheme, selectIsDarkMode } from "@store/app_slice";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

const Description: React.FC<{
  card: Card;
  setSelectedCard: Dispatch<SetStateAction<Card | null>>;
}> = ({ card, setSelectedCard }) => {
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;

  const [isEditingDescription, setIsEditingDescription] =
    useState<boolean>(false);
  const [newDescription, setNewDescription] = useState<string>(
    card?.description || ""
  );
  const params = useParams();
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const [openCardAttachmentListModal, setOpenCardAttachmentListModal] =
    useState<boolean>(false);
  const [selectedattachmentImageUrl, setSelectedAttachmentImageUrl] =
    useState<string>("");

  const { updateCard } = useCards(card.listId, boardId || "");

  // Get board permissions
  const { canUpdateCard } = useBoardPermissionsContext();

  const enableEditDescription = () => {
    if (canUpdateCard()) {
      setIsEditingDescription(true);
    }
  };

  const disableEditDescription = () => {
    setIsEditingDescription(false);
  };

  const handleSaveDescriptionClick = () => {
    updateCard(
      {
        cardId: card.id,
        updates: {
          description: newDescription,
        },
        listId: card.listId,
        destinationListId: card.listId,
      },
      {
        onSuccess: (data) => {
          if (setSelectedCard) {
            setSelectedCard((prevCard) => {
              if (!prevCard) return prevCard;
              return {
                ...prevCard,
                description: newDescription,
              };
            });
          }
        },
      }
    );
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
            icon={<Edit size={14} />}
            type="text"
            size="small"
            onClick={enableEditDescription}
            className="rounded-md hover:opacity-80"
            style={{
              color: `rgb(${colors["text-muted"]})`,
              backgroundColor: "transparent",
            }}
          >
            Edit
          </Button>
        )}
      </div>

      {isEditingDescription ? (
        <div
          className="rounded-md overflow-hidden ml-8"
          style={{
            border: `1px solid rgb(${colors.border})`,
            backgroundColor: `rgb(${colors.surface})`,
          }}
        >
          <RichTextEditor
            initialValue={newDescription}
            onChange={(content: string) => {
              setNewDescription(content);
            }}
            placeholder="Add a more detailed description..."
            className="w-full"
            workspaceId={workspaceId}
            boardId={boardId}
            hasCustomImageSelector={true}
            setOpenCustomImageSelector={setOpenCardAttachmentListModal}
            openCustomImagesSelector={openCardAttachmentListModal}
            selectedAttachmentImageUrl={selectedattachmentImageUrl}
          />
          <div
            className="flex justify-end p-2"
            style={{
              backgroundColor: `rgb(${colors.muted})`,
              borderTop: `1px solid rgb(${colors.border})`,
            }}
          >
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
          className={`ml-8 p-3 rounded-md min-h-20 transition-colors ${
            canUpdateCard() ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed opacity-60"
          }`}
          style={{
            backgroundColor: `rgb(${colors.muted})`,
            color: `rgb(${colors.text})`,
          }}
          onClick={enableEditDescription}
        >
          {card.description ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: newDescription }}
            />
          ) : (
            <span style={{ color: `rgb(${colors["text-muted"]})` }}>
              Add a more detailed description...
            </span>
          )}
        </div>
      )}

      <CardAttachmentImageListModal
        isVisible={openCardAttachmentListModal}
        selectedCard={card}
        setSelectedImageUrl={setSelectedAttachmentImageUrl}
        handleCancel={() => {
          setOpenCardAttachmentListModal(false);
        }}
      />
    </div>
  );
};

export default Description;

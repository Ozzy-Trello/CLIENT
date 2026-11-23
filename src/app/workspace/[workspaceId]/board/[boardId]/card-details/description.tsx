import CardAttachmentImageListModal from "@components/modal-list-card-attachment-images";
import RichTextEditor from "@components/rich-text-editor";
import { useCardDetails } from "@hooks/card-details";
import { Card } from "@myTypes/card";
import { Button, Typography, message } from "antd";
import { AlignLeft, Edit, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectTheme, selectIsDarkMode } from "@store/app_slice";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCardContext } from "@utils/query-invalidation";
import { normalizeQuillHtml, linkifyHtml } from "@utils/normalize-quill-html";
import { isCardDescriptionPlaceholder } from "@utils/card-description";
import { uploadFile } from "@api/file";
import { uploadEmbeddedDescriptionImages } from "@utils/description-images";

const Description: React.FC<{
  card: Card;
  setSelectedCard: Dispatch<SetStateAction<Card | null>>;
  isReviewTarget?: boolean;
}> = ({ card, setSelectedCard, isReviewTarget = false }) => {
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;

  const [isEditingDescription, setIsEditingDescription] =
    useState<boolean>(false);
  const [newDescription, setNewDescription] = useState<string>("");
  const [pendingImageUploads, setPendingImageUploads] = useState(0);
  const [isPreparingDescription, setIsPreparingDescription] = useState(false);
  const preparingRef = useRef(false);
  const pendingUploadsRef = useRef(0);
  const uploadedImagesRef = useRef(new Map<string, string>());
  const activeCardIdRef = useRef(card.id);
  activeCardIdRef.current = card.id;
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
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const { card: detailCard, isDescriptionLoaded, updateCardAsync, isUpdating, refetch } = useCardDetails(
    card.id,
    card.listId,
    boardId || ""
  );
  const queryClient = useQueryClient();

  // Get board permissions
  const { canUpdateCard } = useBoardPermissionsContext();

  const enableEditDescription = () => {
    if (isDescriptionLoaded && canUpdateCard()) {
      setIsEditingDescription(true);
    }
  };

  const disableEditDescription = () => {
    setIsEditingDescription(false);
  };

  const uploadDescriptionImage = async (file: File) => {
    pendingUploadsRef.current += 1;
    setPendingImageUploads(pendingUploadsRef.current);
    try {
      const response = await uploadFile(file, { cardId: card.id, prefix: "card-description" });
      const url = response.data?.url;
      if (!url || !/^https?:\/\//i.test(url)) throw new Error("Image upload did not return a URL");
      return url;
    } finally {
      pendingUploadsRef.current -= 1;
      setPendingImageUploads(pendingUploadsRef.current);
    }
  };

  const handleSaveDescriptionClick = async () => {
    if (!isDescriptionLoaded || isCardDescriptionPlaceholder(detailCard?.description) || preparingRef.current || pendingUploadsRef.current) return;
    preparingRef.current = true;
    setIsPreparingDescription(true);
    try {
      const description = await uploadEmbeddedDescriptionImages(newDescription, uploadDescriptionImage, uploadedImagesRef.current);
      if (activeCardIdRef.current !== card.id) return;
      setNewDescription(description);
      await updateCardAsync({
        description,
      });
      if (activeCardIdRef.current !== card.id) return;
      
      if (setSelectedCard) {
        setSelectedCard((prevCard) => {
          if (!prevCard || prevCard.id !== card.id) return prevCard;
          return {
            ...prevCard,
            description,
          };
        });
      }
      // Refetch card details to get the newest state
      refetch();
      const targetBoardId = card.boardId || boardId || "";
      if (card.listId && targetBoardId) {
        invalidateCardContext(queryClient, {
          cardId: card.id,
          listId: card.listId,
          boardId: targetBoardId,
        });
      }
      setIsEditingDescription(false);
    } catch (error) {
      console.error("Failed to save description:", error);
      message.error("Could not save description. Your draft is still open; please try again.");
      // isUpdating will automatically be reset to false on error
    } finally {
      preparingRef.current = false;
      setIsPreparingDescription(false);
    }
  };

  useEffect(() => {
    // When switching cards, reset edit state and sync description
    setIsEditingDescription(false);
    setNewDescription("");
    uploadedImagesRef.current = new Map();
  }, [card?.id]);

  useEffect(() => {
    if (!isEditingDescription) {
      setNewDescription(detailCard?.description && !isCardDescriptionPlaceholder(detailCard.description) ? detailCard.description : "");
    }
  }, [detailCard?.description, isEditingDescription, isDescriptionLoaded]);

  useEffect(() => {
    if (!isReviewTarget || !descriptionRef.current) return;
    setIsHighlighted(true);
    descriptionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = window.setTimeout(() => setIsHighlighted(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [isReviewTarget]);

  const readOnlyDescription = isDescriptionLoaded ? detailCard?.description || "" : "";
  const normalizedReadOnlyDescription = linkifyHtml(
    normalizeQuillHtml(readOnlyDescription)
  );

  return (
    <div
      ref={descriptionRef}
      className={`mt-6 rounded-lg transition-shadow ${
        isHighlighted ? "ring-2 ring-blue-300 ring-offset-2" : ""
      }`}
    >
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
            disabled={!isDescriptionLoaded}
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

      {!isDescriptionLoaded ? (
        <div className="ml-8 p-3 min-h-20" aria-label="Loading description"><Loader2 className="animate-spin" size={16} /></div>
      ) : isEditingDescription ? (
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
            onImageUpload={uploadDescriptionImage}
            readOnly={isPreparingDescription || isUpdating}
          />
          {pendingImageUploads > 0 && <div role="status" className="px-3 py-2">Uploading images...</div>}
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
              disabled={isUpdating || isPreparingDescription || pendingImageUploads > 0 || !isDescriptionLoaded}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSaveDescriptionClick}
              size="middle"
              className="rounded-md bg-blue-600 hover:bg-blue-700"
              loading={isUpdating || isPreparingDescription}
              disabled={isUpdating || isPreparingDescription || pendingImageUploads > 0}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`ml-8 p-3 rounded-md min-h-20 transition-colors`}
          style={{
            backgroundColor: `rgb(${colors.muted})`,
            color: `rgb(${colors.text})`,
          }}
        >
          {readOnlyDescription ? (
            <div
              className="prose prose-sm max-w-none prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5 prose-a:text-blue-600 prose-a:underline prose-a:cursor-pointer"
              dangerouslySetInnerHTML={{ __html: normalizedReadOnlyDescription }}
              onClick={(e) => {
                // Handle link clicks to open in new tab
                const target = e.target as HTMLElement;
                if (target.tagName === 'A') {
                  e.preventDefault();
                  e.stopPropagation();
                  const href = target.getAttribute('href');
                  if (href) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
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

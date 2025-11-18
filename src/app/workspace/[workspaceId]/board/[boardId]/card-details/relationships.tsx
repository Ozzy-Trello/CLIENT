import { useMemo, useState, Dispatch, SetStateAction } from "react";
import { Button, Empty, Typography } from "antd";
import { Plus, Link as LinkIcon, GitBranch } from "lucide-react";
import { Card, EnumAttachmentType } from "@myTypes/card";
import { useParams } from "next/navigation";
import { useCardAttachment } from "@hooks/card_attachment";
import { mapBackendCardToFrontend } from "@api/card";
import AttachedCard from "./attached-card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import CreateSubcardModal from "@components/modal-create-subcard";

interface RelationshipsProps {
  card: Card;
  setCard?: Dispatch<SetStateAction<Card | null>>;
}

interface LinkedCardEntry {
  attachmentId: string;
  card: Card;
}

const Relationships: React.FC<RelationshipsProps> = ({ card, setCard }) => {
  const params = useParams();
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  const listId =
    card?.listId || (card as any)?.list_id || (card as any)?.listId || "";
  const { cardAttachments, deleteAttachment } = useCardAttachment(
    card?.id || "",
    {
      listId,
      boardId: boardId as string,
    }
  );

  const { canUpdateCard } = useBoardPermissionsContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const linkedCards: LinkedCardEntry[] = useMemo(() => {
    if (!cardAttachments) return [];
    return cardAttachments
      .filter(
        (attachment) =>
          attachment.attachableType === EnumAttachmentType.Card &&
          attachment.targetCard
      )
      .map((attachment) => ({
        attachmentId: attachment.id,
        card: mapBackendCardToFrontend(
          attachment.targetCard
        ) as unknown as Card,
      }));
  }, [cardAttachments]);

  const subcards = card?.subCards || card?.sub || [];

  const handleSubcardCreated = (newCard: Card | null) => {
    if (!newCard) return;
    if (setCard) {
      setCard((prev) => {
        if (!prev) return prev;
        const existing = prev.subCards || prev.sub || [];
        return {
          ...prev,
          subCards: [...existing, newCard],
          sub: [...existing, newCard],
        };
      });
    }
  };

  const RelationshipSection = ({
    title,
    items,
  }: {
    title: string;
    items: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
        {title === "Subcards" ? (
          <GitBranch size={14} className="text-gray-400" />
        ) : (
          <LinkIcon size={14} className="text-gray-400" />
        )}
        <span>{title}</span>
      </div>
      {items}
    </div>
  );

  return (
    <div className="space-y-4">
      {card.parentCard && (
        <RelationshipSection
          title="Parent Card"
          items={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AttachedCard card={card.parentCard} />
            </div>
          }
        />
      )}

      <RelationshipSection
        title="Subcards"
        items={
          subcards && subcards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subcards.map((subcard) => (
                <AttachedCard key={subcard.id} card={subcard} />
              ))}
            </div>
          ) : (
            <Empty
              description="No subcards yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )
        }
      />

      <RelationshipSection
        title="Linked Cards"
        items={
          linkedCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {linkedCards.map(({ attachmentId, card: linkedCard }) => (
                <AttachedCard
                  key={linkedCard.id}
                  card={linkedCard}
                  onDelete={
                    canUpdateCard()
                      ? () =>
                          deleteAttachment({
                            attachmentId,
                            cardId: card.id || "",
                          })
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <Empty
              description="No linked cards"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )
        }
      />
    </div>
  );
};

export default Relationships;

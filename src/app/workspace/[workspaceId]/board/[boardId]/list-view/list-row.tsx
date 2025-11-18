"use client";
import { Draggable } from "@hello-pangea/dnd";
import { Card, EnumCardType } from "@myTypes/card";
import type { CardLabel } from "@myTypes/label";
import { AnyList } from "@myTypes/list";
import MembersList from "@components/members-list";
import { useCardMembers } from "@hooks/card_member";
import { useCardDetailContext } from "@providers/card-detail-context";
import CardContextMenu from "@components/card-context-menu";
import { BarChart2, Square } from "lucide-react";
import { usePermissions } from "@hooks/account";
import { calculateTimeInList } from "@utils/general";
import { useLabels } from "@hooks/label";
import { useParams } from "next/navigation";

interface ListRowProps {
  card: Card;
  index: number;
  list: AnyList;
}

const ListRow: React.FC<ListRowProps> = ({ card, index, list }) => {
  const { cardMembers } = useCardMembers(card?.id);
  const { openCardDetail } = useCardDetailContext();
  const { canMove } = usePermissions();
  const canMoveCard = canMove("card");

  // Fetch card labels for rendering next to the card name
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string);
  const { cardLabels } = useLabels(workspaceId || "", card?.id);

  // Subtle dashcard distinction
  const isDashcard = card?.type === EnumCardType.Dashcard;
  const accentColor = card?.dashConfig?.backgroundColor || "#1890ff"; // default blue

  const timeInList = card?.formattedTimeInList ||
    (card?.createdAt ? calculateTimeInList(card.createdAt) : undefined);

  const handleClick = (e: React.MouseEvent) => {
    openCardDetail(card, list);
  };

  return (
    <Draggable draggableId={card.id} index={index} isDragDisabled={!canMoveCard}>
      {(provided, snapshot) => (
        <CardContextMenu card={card} list={list}>
          <div
            className={`list-row-container bg-white rounded border border-gray-200 px-3 py-2
              hover:bg-gray-50 transition-colors duration-150 w-full
              ${canMoveCard ? "cursor-pointer" : "cursor-default"}
              ${snapshot.isDragging ? "shadow-sm" : ""}
            `}
            style={isDashcard ? { borderLeft: `3px solid ${accentColor}` } : undefined}
            ref={provided.innerRef}
            {...provided.dragHandleProps}
            {...provided.draggableProps}
            onClick={handleClick}
            title={!canMoveCard ? "You don't have permission to move cards" : undefined}
          >
            <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] items-center gap-3">
              {/* Name + subtle type icon */}
              <div className="flex items-center gap-2 min-w-0">
                {isDashcard ? (
                  <span title="Dashcard" className="shrink-0 text-blue-600">
                    <BarChart2 size={12} />
                  </span>
                ) : (
                  <span title="Card" className="shrink-0 text-gray-400">
                    <Square size={12} />
                  </span>
                )}
                <div className="truncate text-sm font-medium text-blue-800">{card?.name}</div>
                {/* Labels next to card name */}
                {cardLabels && cardLabels.length > 0 && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {cardLabels.slice(0, 6).map((label: CardLabel) => (
                      <span
                        key={label.labelId || label.id}
                        className="inline-flex items-center px-1.5 py-[1px] rounded-sm text-[10px] font-medium"
                        style={{
                          backgroundColor: label.value || "#e5e7eb",
                          color: "#fff",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                        title={label.name}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="flex items-center justify-start">
                {cardMembers && (
                  <MembersList
                    members={cardMembers}
                    membersLength={cardMembers?.length}
                    membersLoopLimit={4}
                  />
                )}
              </div>

              {/* Age (time in list) */}
              <div className="flex items-center justify-end text-[11px] text-gray-600">
                <span className="truncate">{timeInList || "--"}</span>
              </div>
            </div>
          </div>
        </CardContextMenu>
      )}
    </Draggable>
  );
};

export default ListRow;
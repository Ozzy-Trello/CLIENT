"use client";
import { FC, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, EnumCardType } from "@myTypes/card";
import type { CardLabel } from "@myTypes/label";
import { AnyList } from "@myTypes/list";
import MembersList from "@components/members-list";
import { useCardMembers } from "@hooks/card_member";
import { useCardDetailContext } from "@providers/card-detail-context";
import CardContextMenu from "@components/card-context-menu";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { UserSelection } from "@components/selection";
import {
  Plus,
  ChevronRight,
  BarChart2,
  Square,
  ChevronDown,
} from "lucide-react";
import { Popover } from "antd";
import { usePermissions } from "@hooks/account";
import { calculateTimeInList } from "@utils/general";
import { useLabels } from "@hooks/label";
import { useParams } from "next/navigation";

interface ListRowProps {
  card: Card;
  index: number;
  list: AnyList;
}

interface InlineMemberPickerProps {
  excludeIds: string[];
  onSelect: (value: string) => void;
}

const InlineMemberPicker: FC<InlineMemberPickerProps> = ({
  excludeIds,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (!value) return;
    onSelect(value);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      trigger="click"
      content={
        <UserSelection
          placeholder="Select user"
          size="small"
          width={220}
          excludeIds={excludeIds}
          onChange={(value: any) => handleSelect(value)}
        />
      }
      overlayClassName="inline-member-picker"
    >
      <div
        className="flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-300 cursor-pointer hover:border-gray-400"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Plus size={12} />
      </div>
    </Popover>
  );
};

const ListRow: FC<ListRowProps> = ({ card, index, list }) => {
  const { cardMembers, toggleMember, removeMember } = useCardMembers(card?.id);
  const { openCardDetail } = useCardDetailContext();
  const { canMove } = usePermissions();
  const canMoveCard = canMove("card");
  const [showSubcards, setShowSubcards] = useState<boolean>(false);
  const { canManageCardMembers } = useBoardPermissionsContext();

  // Fetch card labels for rendering next to the card name
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string);
  const { cardLabels } = useLabels(workspaceId || "", card?.id);

  // Subtle dashcard distinction
  const isDashcard = card?.type === EnumCardType.Dashcard;
  const accentColor = card?.dashConfig?.backgroundColor || "#1890ff"; // default blue
  const hasSubcards = Array.isArray(card?.subCards) && card.subCards.length > 0;

  const timeInList =
    card?.formattedTimeInList ||
    (card?.createdAt ? calculateTimeInList(card.createdAt) : undefined);

  const handleMemberSelection = (value: string) => {
    if (!value) return;
    toggleMember(value);
  };

  const handleClick = (e: React.MouseEvent) => {
    openCardDetail(card, list);
  };

  const handleToggleSubcards = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubcards((prev) => !prev);
  };

  return (
    <Draggable
      draggableId={card.id}
      index={index}
      isDragDisabled={!canMoveCard}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
          className="flex w-full flex-col gap-2"
        >
          <CardContextMenu card={card} list={list}>
            <div
              className={`list-row-container bg-white rounded border border-gray-200 px-3 py-2
              hover:bg-gray-50 transition-colors duration-150 w-full
              ${canMoveCard ? "cursor-pointer" : "cursor-default"}
              ${snapshot.isDragging ? "shadow-sm" : ""}
            `}
              style={
                isDashcard
                  ? { borderLeft: `3px solid ${accentColor}` }
                  : undefined
              }
              {...provided.dragHandleProps}
              onClick={handleClick}
              title={
                !canMoveCard
                  ? "You don't have permission to move cards"
                  : undefined
              }
            >
              <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] items-center gap-3">
                {/* Name + subtle type icon */}
                <div className="flex items-center gap-2 min-w-0">
                  {hasSubcards ? (
                    <button
                      onClick={handleToggleSubcards}
                      className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      aria-label={
                        showSubcards ? "Collapse subcards" : "Expand subcards"
                      }
                    >
                      {showSubcards ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </button>
                  ) : (
                    <span className="inline-flex w-3" />
                  )}
                  {isDashcard ? (
                    <span title="Dashcard" className="shrink-0 text-blue-600">
                      <BarChart2 size={12} />
                    </span>
                  ) : (
                    <span title="Card" className="shrink-0 text-gray-400">
                      <Square size={12} />
                    </span>
                  )}
                  <div className="truncate text-sm font-medium text-blue-800">
                    {card?.name}
                  </div>
                  {/* Labels next to card name */}
                  {cardLabels && cardLabels.length > 0 && (
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {cardLabels.slice(0, 6).map((label: CardLabel) => (
                        <span
                          key={label.labelId || label.id}
                          className="inline-flex items-center px-1 py-[0px] rounded-[3px] text-[9px] font-normal leading-4"
                          style={{
                            backgroundColor: label.value || "#e5e7eb",
                            color: "#fff",
                            border: "1px solid rgba(0,0,0,0.05)",
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
                <div
                  className="flex items-center justify-start gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cardMembers && (
                    <MembersList
                      members={cardMembers}
                      membersLength={cardMembers?.length}
                      membersLoopLimit={4}
                      onRemoveMember={
                        canManageCardMembers() ? removeMember : undefined
                      }
                    />
                  )}
                  {canManageCardMembers() && (
                    <InlineMemberPicker
                      excludeIds={(cardMembers || []).map((m) => m.id)}
                      onSelect={handleMemberSelection}
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

          {hasSubcards && showSubcards && (
            <div className="ml-6 border-l border-dashed border-gray-200 pl-3 space-y-2">
              {card.subCards?.map((subCard) => (
                <SubcardRow
                  key={subCard.id}
                  card={subCard}
                  parentList={list}
                  depth={1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

interface SubcardRowProps {
  card: Card;
  parentList: AnyList;
  depth?: number;
}

const SubcardRow: FC<SubcardRowProps> = ({ card, parentList, depth = 1 }) => {
  const { openCardDetail } = useCardDetailContext();
  const { canMove } = usePermissions();
  const canMoveCard = canMove("card");
  const [expanded, setExpanded] = useState(false);
  const childSubcards = card.subCards || card.sub || [];
  const hasNestedSubcards = childSubcards.length > 0;
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string);
  const { cardLabels } = useLabels(workspaceId || "", card?.id);

  const isDashcard = card?.type === EnumCardType.Dashcard;
  const accentColor = card?.dashConfig?.backgroundColor || "#1890ff";
  const timeInList =
    card?.formattedTimeInList ||
    (card?.createdAt ? calculateTimeInList(card.createdAt) : undefined);

  const { cardMembers, toggleMember, removeMember } = useCardMembers(card?.id);
  const { canManageCardMembers } = useBoardPermissionsContext();
  const handleSubMemberSelection = (value: string) => {
    if (!value) return;
    toggleMember(value);
  };

  const resolvedList: AnyList = {
    id: card.listId || (card as any)?.list_id || parentList.id,
    boardId: card.boardId || (card as any)?.board_id || parentList.boardId,
    name: card.listName || (card as any)?.list_name || parentList.name,
    background: parentList.background,
  };

  const displayBoardName =
    card.boardName || (card as any)?.board_name || parentList.boardId;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openCardDetail(card, resolvedList);
  };

  const toggleNested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const indentPx = Math.min(depth, 5) * 8;
  const containerClass =
    depth > 0
      ? "space-y-1 border-l border-dashed border-gray-200"
      : "space-y-1";
  return (
    <div
      className={containerClass}
      style={depth > 0 ? { marginLeft: indentPx, paddingLeft: 8 } : undefined}
    >
      <CardContextMenu card={card} list={resolvedList}>
        <div
          className={`list-row-container bg-white rounded border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors duration-150 w-full ${
            canMoveCard ? "cursor-pointer" : "cursor-default"
          }`}
          style={
            isDashcard ? { borderLeft: `3px solid ${accentColor}` } : undefined
          }
          onClick={handleClick}
        >
          <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {hasNestedSubcards ? (
                <button
                  onClick={toggleNested}
                  className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  aria-label={
                    expanded
                      ? "Collapse nested subcards"
                      : "Expand nested subcards"
                  }
                >
                  {expanded ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
              ) : (
                <span className="inline-flex w-3" />
              )}
              {isDashcard ? (
                <span title="Dashcard" className="shrink-0 text-blue-600">
                  <BarChart2 size={12} />
                </span>
              ) : (
                <span title="Card" className="shrink-0 text-gray-400">
                  <Square size={12} />
                </span>
              )}
              <div className="truncate text-sm font-medium text-blue-800">
                {card?.name}
              </div>
              {cardLabels && cardLabels.length > 0 && (
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {cardLabels.slice(0, 6).map((label: CardLabel) => (
                    <span
                      key={label.labelId || label.id}
                      className="inline-flex items-center px-1 py-[0px] rounded-[3px] text-[9px] font-normal leading-4"
                      style={{
                        backgroundColor: label.value || "#e5e7eb",
                        color: "#fff",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                      title={label.name}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-start gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {cardMembers && (
                <MembersList
                  members={cardMembers}
                  membersLength={cardMembers?.length}
                  membersLoopLimit={3}
                  onRemoveMember={removeMember}
                />
              )}
              {canManageCardMembers() && (
                <InlineMemberPicker
                  excludeIds={(cardMembers || []).map((m) => m.id)}
                  onSelect={handleSubMemberSelection}
                />
              )}
            </div>

            <div className="flex items-center justify-end text-[11px] text-gray-600">
              <span className="truncate">{timeInList || "--"}</span>
            </div>
          </div>

          <div className="pl-6 pt-1 text-[10px] text-gray-500 flex flex-wrap gap-3">
            {resolvedList.name && (
              <span className="inline-flex gap-1 items-center">
                <span className="text-gray-400">List:</span>
                <span className="font-medium text-gray-600">
                  {resolvedList.name}
                </span>
              </span>
            )}
            {displayBoardName && (
              <span className="inline-flex gap-1 items-center">
                <span className="text-gray-400">Board:</span>
                <span className="font-medium text-gray-600">
                  {displayBoardName}
                </span>
              </span>
            )}
          </div>
        </div>
      </CardContextMenu>

      {hasNestedSubcards && expanded && (
        <>
          {childSubcards.map((child) => (
            <SubcardRow
              key={child.id}
              card={child}
              parentList={resolvedList}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default ListRow;

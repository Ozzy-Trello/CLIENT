"use client";
import CardContextMenu from "@components/card-context-menu";
import MembersList from "@components/members-list";
import { UserSelection } from "@components/selection";
import { Draggable } from "@hello-pangea/dnd";
import { usePermissions } from "@hooks/account";
import { useCardMembers } from "@hooks/card_member";
import { useLabels } from "@hooks/label";
import { Card, EnumCardType } from "@myTypes/card";
import type { CardLabel } from "@myTypes/label";
import { AnyList } from "@myTypes/list";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useCardDetailContext } from "@providers/card-detail-context";
import { calculateTimeInList } from "@utils/general";
import { Popover } from "antd";
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  Plus,
  Square,
} from "lucide-react";
import { useParams } from "next/navigation";
import { FC, useEffect, useRef, useState } from "react";

interface ListRowProps {
  card: Card;
  index: number;
  list: AnyList;
}

interface InlineMemberPickerProps {
  excludeIds: string[];
  onSelect: (value: string) => void;
}

const STICKY_BASE_OFFSET = 12; // px, matches px-3 padding
const SUBCARD_INDENT_STEP = 24; // px offset added per depth level for sticky column

const defaultCardBackground = "#ffffff";

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
        className="flex items-center justify-center w-4 h-4 rounded-full border border-dashed border-gray-300 cursor-pointer hover:border-gray-400"
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

const hexToRgba = (hexColor: string | undefined, alpha = 1) => {
  if (!hexColor) return `rgba(255, 255, 255, ${alpha})`;
  if (!hexColor.startsWith("#")) {
    return alpha === 1 ? hexColor : `rgba(255, 255, 255, ${alpha})`;
  }
  let normalized = hexColor.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createStickyGradient = (color?: string) => {
  const solid = hexToRgba(color, 1);
  const transparent = hexToRgba(color, 0);
  return `linear-gradient(90deg, ${solid} 80%, ${transparent})`;
};

const ListRow: FC<ListRowProps> = ({ card, index, list }) => {
  const { cardMembers, toggleMember, removeMember } = useCardMembers(card?.id);
  const { openCardDetail } = useCardDetailContext();
  const { canMove } = usePermissions();
  const canMoveCard = canMove("card");
  const [showSubcards, setShowSubcards] = useState<boolean>(false);
  const { canManageCardMembers } = useBoardPermissionsContext();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [rowBgColor, setRowBgColor] = useState<string>(defaultCardBackground);

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

  useEffect(() => {
    if (rowRef.current) {
      const cs = window.getComputedStyle(rowRef.current);
      const bg = cs.backgroundColor || defaultCardBackground;
      setRowBgColor(bg);
    }
  }, [rowRef]);

  const stickyBaseColor = rowBgColor;
  const stickyGradient = createStickyGradient(stickyBaseColor);
  const refreshRowBg = () => {
    if (!rowRef.current) return;
    const cs = window.getComputedStyle(rowRef.current);
    const bg = cs.backgroundColor || defaultCardBackground;
    setRowBgColor(bg);
  };
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
              className={`list-row-container bg-white rounded border border-gray-200 px-3 py-3
              hover:bg-gray-50 transition-colors duration-150 w-full min-w-[520px]
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
              onMouseEnter={() => requestAnimationFrame(refreshRowBg)}
              onMouseLeave={() => requestAnimationFrame(refreshRowBg)}
              title={
                !canMoveCard
                  ? "You don't have permission to move cards"
                  : undefined
              }
              ref={rowRef}
            >
              <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] items-center gap-3">
                {/* Name + subtle type icon */}
                <div
                  className="flex items-center gap-2 min-w-0 sticky pr-4 z-[100] relative bg-white"
                  style={{
                    left: STICKY_BASE_OFFSET,
                    backgroundColor: "inherit",
                  }}
                >
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
                  <div
                    className="pointer-events-none absolute inset-y-0 right-[-10px] w-10"
                    style={{
                      backgroundColor: "inherit",
                      WebkitMaskImage:
                        "linear-gradient(90deg, black 80%, transparent)",
                      maskImage:
                        "linear-gradient(90deg, black 80%, transparent)",
                    }}
                  />
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
                <div className="flex items-center justify-end text-[11px] text-gray-600 pr-3">
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
  const subRowRef = useRef<HTMLDivElement | null>(null);
  const [subRowBgColor, setSubRowBgColor] = useState<string>(
    defaultCardBackground
  );
  const refreshSubRowBg = () => {
    if (!subRowRef.current) return;
    const cs = window.getComputedStyle(subRowRef.current);
    const bg = cs.backgroundColor || defaultCardBackground;
    setSubRowBgColor(bg);
  };
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

  const stickyGradient = createStickyGradient(defaultCardBackground);
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

  const containerClass =
    depth > 0
      ? "space-y-1 border-l border-dashed border-gray-200"
      : "space-y-1";
  return (
    <div className={containerClass}>
      <CardContextMenu card={card} list={resolvedList}>
        <div
          className={`list-row-container bg-white rounded border border-gray-200 px-3 py-3 hover:bg-gray-50 transition-colors duration-150 w-full min-w-[520px] ${
            canMoveCard ? "cursor-pointer" : "cursor-default"
          }`}
          style={
            isDashcard ? { borderLeft: `3px solid ${accentColor}` } : undefined
          }
          onClick={handleClick}
          onMouseEnter={() => requestAnimationFrame(refreshSubRowBg)}
          onMouseLeave={() => requestAnimationFrame(refreshSubRowBg)}
          ref={subRowRef}
        >
          <div className="grid grid-cols-[minmax(160px,1fr)_180px_120px] items-center gap-3">
            <div
              className="flex items-center gap-2 min-w-0 sticky pr-4 z-[100] relative bg-white"
              style={{
                left: STICKY_BASE_OFFSET + depth * SUBCARD_INDENT_STEP,
                backgroundColor: "inherit",
              }}
            >
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
              <div className="flex flex-row gap-1 truncate text-sm font-medium text-blue-800">
                <span>{card?.name}</span>
                <div className="hidden sm:flex text-[10px] text-gray-500 flex flex-wrap gap-3">
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
              <div
                className="pointer-events-none absolute inset-y-0 right-[-10px] w-10"
                style={{
                  backgroundColor: "inherit",
                  WebkitMaskImage:
                    "linear-gradient(90deg, black 80%, transparent)",
                  maskImage: "linear-gradient(90deg, black 80%, transparent)",
                }}
              />
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

            <div className="flex items-center justify-end text-[11px] text-gray-600 pr-3">
              <span className="truncate">{timeInList || "--"}</span>
            </div>
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

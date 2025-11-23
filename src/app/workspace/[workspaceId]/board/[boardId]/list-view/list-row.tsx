"use client";
import CardContextMenu from "@components/card-context-menu";
import MembersList from "@components/members-list";
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
import { BarChart2, ChevronDown, ChevronRight, Square, CornerDownRight } from "lucide-react";
import { useParams } from "next/navigation";
import { FC, useEffect, useRef, useState } from "react";
import InlineMemberPicker from "./components/inline-member-picker";
import PriorityDropdown from "./components/priority-dropdown";
import SubcardRow from "./components/subcard-row";
import { STICKY_BASE_OFFSET, defaultCardBackground } from "./utils";

interface ListRowProps {
  card: Card;
  index: number;
  list: AnyList;
  subtaskMode?: "collapsed" | "expanded" | "separated";
}

const getContrastTextColor = (hex: string): string => {
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000" : "#fff";
};

const ListRow: FC<ListRowProps> = ({
  card,
  index,
  list,
  subtaskMode = "collapsed",
}) => {
  const { cardMembers, toggleMember, removeMember } = useCardMembers(card?.id);
  const { canManageCardMembers } = useBoardPermissionsContext();
  const { openCardDetail } = useCardDetailContext();
  const { canMove } = usePermissions();
  const canMoveCard = canMove("card");
  const [showSubcards, setShowSubcards] = useState<boolean>(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

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
  const isSubtask =
    !!(card as any)?.parentId ||
    !!(card as any)?.parent_id ||
    !!(card as any)?.parentCard ||
    !!(card as any)?.parent_card;
  const parentName =
    (card as any)?.parentCard?.name || (card as any)?.parent_card?.name || "";
  const parentBoardId =
    (card as any)?.parentCard?.boardId ||
    (card as any)?.parent_card?.board_id ||
    (card as any)?.parentBoardId ||
    (card as any)?.parent_board_id ||
    "";
  const nestedVisible =
    subtaskMode === "expanded"
      ? true
      : subtaskMode === "separated"
      ? false
      : showSubcards;

  if (isSubtask && subtaskMode !== "separated") {
    if (parentBoardId && parentBoardId === list.boardId) {
      return null;
    }
  }

  const timeInList =
    card?.formattedTimeInList ||
    (card?.createdAt ? calculateTimeInList(card.createdAt) : undefined);

  useEffect(() => {
    if (rowRef.current) {
      const cs = window.getComputedStyle(rowRef.current);
      const bg = cs.backgroundColor || defaultCardBackground;
      rowRef.current.style.setProperty("--row-bg-color", bg);
    }
  }, [rowRef]);

  const refreshRowBg = () => {
    if (!rowRef.current) return;
    const cs = window.getComputedStyle(rowRef.current);
    const bg = cs.backgroundColor || defaultCardBackground;
    rowRef.current.style.setProperty("--row-bg-color", bg);
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

  const openParent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const parent = (card as any)?.parentCard || (card as any)?.parent_card;
    console.log(parent, "<< ni parent");
    if (!parent || !parent.id) return;
    const parentList: AnyList = {
      id: parent.listId || parent.list_id,
      boardId: parent.boardId || parent.board_id,
      name: parent.listName || parent.list_name,
      background: list.background,
    } as AnyList;
    openCardDetail(parent as Card, parentList);
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
              <div className="grid grid-cols-[minmax(160px,1fr)_120px_180px_120px] items-center gap-3">
                {/* Name + subtle type icon */}
                <div
                  className="flex items-center gap-2 min-w-0 sticky pr-4 z-[100] relative bg-white"
                  style={{
                    left: STICKY_BASE_OFFSET,
                    backgroundColor: "inherit",
                  }}
                >
                  {hasSubcards && subtaskMode === "collapsed" ? (
                    <button
                      onClick={handleToggleSubcards}
                      className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      aria-label={
                        nestedVisible ? "Collapse subcards" : "Expand subcards"
                      }
                    >
                      {nestedVisible ? (
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
                    <span
                      title={isSubtask ? "Subtask" : "Card"}
                      className={`shrink-0 ${
                        isSubtask ? "text-purple-500" : "text-gray-400"
                      }`}
                    >
                      {isSubtask && subtaskMode === "separated" ? (
                        <CornerDownRight size={12} />
                      ) : (
                        <Square size={12} />
                      )}
                    </span>
                  )}
                  <div className="truncate text-sm font-medium text-blue-800">
                    {card?.name}
                    {isSubtask && subtaskMode === "separated" && (
                      <button
                        type="button"
                        onClick={openParent}
                        className="mt-[2px] inline-flex items-center gap-[3px] px-[2px] py-[0px] rounded !text-gray-400 text-[7px] leading-[8px] font-normal cursor-pointer hover:!text-blue-600 hover:underline transform translate-y-[1px]"
                        title={
                          parentName ? `Subtask of ${parentName}` : "Subtask"
                        }
                      >
                        <CornerDownRight size={8} className="text-gray-400" />
                        <span className="!text-[7px] leading-[8px] truncate">
                          {parentName || "Parent"}
                        </span>
                      </button>
                    )}
                  </div>
                  {/* Labels next to card name */}
                  {cardLabels && cardLabels.length > 0 && (
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {cardLabels.slice(0, 6).map((label: CardLabel) => (
                        <span
                          key={label.labelId || label.id}
                          className="inline-flex items-center px-[6px] py-[0px] rounded-[3px] text-[8px] font-medium leading-[14px]"
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

                {/* Priority */}
                <div
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PriorityDropdown
                    cardId={card.id}
                    listId={card.listId}
                    boardId={list.boardId || card.boardId || ""}
                    priority={card.priorityInfo}
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

          {hasSubcards && nestedVisible && (
            <div className="ml-6 border-l border-dashed border-gray-200 pl-3 space-y-2">
              {card.subCards?.map((subCard) => (
                <SubcardRow
                  key={subCard.id}
                  card={subCard}
                  parentList={list}
                  depth={1}
                  subtaskMode={subtaskMode}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default ListRow;

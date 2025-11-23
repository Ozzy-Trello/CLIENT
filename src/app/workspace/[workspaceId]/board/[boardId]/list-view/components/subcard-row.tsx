"use client";

import CardContextMenu from "@components/card-context-menu";
import MembersList from "@components/members-list";
import { useCardMembers } from "@hooks/card_member";
import { useLabels } from "@hooks/label";
import { Card, EnumCardType } from "@myTypes/card";
import { CardLabel } from "@myTypes/label";
import { AnyList } from "@myTypes/list";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useCardDetailContext } from "@providers/card-detail-context";
import { calculateTimeInList } from "@utils/general";
import { usePermissions } from "@hooks/account";
import { ChevronDown, ChevronRight, Square, BarChart2 } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import InlineMemberPicker from "./inline-member-picker";
import PriorityDropdown from "./priority-dropdown";
import { STICKY_BASE_OFFSET, SUBCARD_INDENT_STEP } from "../utils";

interface SubcardRowProps {
  card: Card;
  parentList: AnyList;
  depth?: number;
  subtaskMode?: "collapsed" | "expanded" | "separated";
}

const SubcardRow: React.FC<SubcardRowProps> = ({
  card,
  parentList,
  depth = 1,
  subtaskMode = "collapsed",
}) => {
  const { openCardDetail } = useCardDetailContext();
  const { canMove } = usePermissions();
  const canMoveCard = canMove("card");
  const [expanded, setExpanded] = useState(subtaskMode === "expanded");
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
        >
          <div className="grid grid-cols-[minmax(160px,1fr)_120px_180px_120px] items-center gap-3">
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
                  maskImage: "linear-gradient(90deg, black 80%, transparent)",
                }}
              />
            </div>

            <div
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <PriorityDropdown
                cardId={card.id}
                listId={resolvedList.id}
                boardId={resolvedList.boardId}
                priority={card.priorityInfo}
              />
            </div>

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {cardMembers && (
                <MembersList
                  members={cardMembers}
                  membersLength={cardMembers?.length}
                  membersLoopLimit={3}
                  onRemoveMember={canManageCardMembers() ? removeMember : undefined}
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
              subtaskMode={subtaskMode}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default SubcardRow;

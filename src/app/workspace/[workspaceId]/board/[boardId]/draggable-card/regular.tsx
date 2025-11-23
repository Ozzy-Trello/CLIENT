import { CardDateDisplay } from "@components/card-dates";
import MembersList from "@components/members-list";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useCardMembers } from "@hooks/card_member";
import { Card, CardCustomField } from "@myTypes/card";
import { isImageFile } from "@utils/file";
import {
  Avatar,
  Checkbox,
  CheckboxChangeEvent,
  Dropdown,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import TouchAwareTooltip from "@components/touch-aware-tooltip";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  MessageSquare,
  MoreHorizontal,
  MoveUpRight,
  Paperclip,
  Text,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { LookupCache } from "@utils/lookup-cache";
import { useLabels } from "@hooks/label";
import { CardLabel } from "@myTypes/label";
import "./styles.css";
import { userDetails } from "@api/account";
import { fetchLookups } from "@utils/fetch-lookups";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { usePriorities } from "@hooks/priority";
import { useCardDetails } from "@hooks/card-details";
import PriorityFlag from "../list-view/components/priority-flag";

// Utility to convert "3 hours 30 minutes" to "3h 30m"
function formatTimeShort(timeStr: string | undefined): string {
  if (!timeStr || timeStr === "--") return "--";

  return timeStr
    .replace(/ hours?/g, "h")
    .replace(/ minutes?/g, "m")
    .replace(/ days?/g, "d")
    .replace(/ seconds?/g, "s")
    .trim();
}

interface RegularCardProps {
  card: Card;
  isHovered: boolean;
  onCompletionChange: (e: CheckboxChangeEvent, card: Card) => void;
  isDragging?: boolean;
}

// Utility: decide black/white text based on background color
function getContrastTextColor(hex: string): string {
  // Remove hash
  const cleaned = hex.replace("#", "");
  // Parse r,g,b
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000" : "#fff";
}

const RegularCard: React.FC<RegularCardProps> = (props) => {
  const { card, isHovered, onCompletionChange, isDragging = false } = props;
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string | undefined);
  const boardIdParam = Array.isArray(params.boardId)
    ? params.boardId[0]
    : (params.boardId as string | undefined);
  const effectiveBoardId = (card.boardId || boardIdParam || "") as string;
  const { cardMembers, addMember, removeMember } = useCardMembers(card?.id);
  const { canUpdateCard } = useBoardPermissionsContext();
  const canEditMembers = canUpdateCard();
  const { cardCustomFields } = useCardCustomField(
    card.id,
    workspaceId as string
  );
  const [frontCustomFields, setfrontCustomFields] = useState<CardCustomField[]>(
    []
  );
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  // local version state to force re-render after lookups populate
  const [lookupVersion, setLookupVersion] = useState(0);
  const { updateCard } = useCardDetails(
    card.id,
    card.listId,
    effectiveBoardId,
    { skipFetch: true }
  );
  const [isPriorityUpdating, setPriorityUpdating] = useState(false);
  const prioritiesQuery = usePriorities(canEditMembers);
  const priorityOptions = prioritiesQuery.data?.data ?? [];
  const [displayPriority, setDisplayPriority] = useState(
    card.priorityInfo || null
  );
  useEffect(() => {
    setDisplayPriority(card.priorityInfo || null);
  }, [card.priorityInfo?.id, card.priorityInfo?.name, card.priorityInfo?.color]);
  const priorityMenuItems = useMemo<MenuProps["items"]>(() => {
    const items: MenuProps["items"] = priorityOptions.map((priority) => ({
      key: priority.id,
      label: (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-white/40"
            style={{
              backgroundColor: priority.color || "#E5E7EB",
            }}
          />
          <span>{priority.name}</span>
        </div>
      ),
    }));

    if (items.length > 0) {
      items.push({ type: "divider" });
    }

    items.push({
      key: "__no_priority__",
      label: "No priority",
    });

    return items;
  }, [priorityOptions]);

  // Fetch labels assigned to this card
  const { cardLabels } = useLabels(
    Array.isArray(workspaceId)
      ? (workspaceId[0] as string)
      : (workspaceId as string),
    card.id,
    { cardId: card.id }
  );

  // useEffect(() => {
  //   if (cardCustomFields) {
  //     const filtered = cardCustomFields.filter((item) => item.isShowAtFront);
  //     setfrontCustomFields(filtered);
  //   }
  // }, cardCustomFields);

  // Ensure any referenced userIds are cached for quick label lookup
  useEffect(() => {
    const userIds: string[] = [];
    // from custom fields
    cardCustomFields?.forEach((f) => {
      if (f.valueUserId) userIds.push(f.valueUserId);
    });
    // from card members
    cardMembers?.forEach((m: any) => {
      if (m.id) userIds.push(m.id);
    });

    const unique = Array.from(new Set(userIds));
    const unknown = unique.filter((id) => !LookupCache.label("user", id));

    if (unknown.length) {
      (async () => {
        await fetchLookups("user", unknown, userDetails as any);
        setLookupVersion((v) => v + 1);
      })();
    }
  }, [cardCustomFields, cardMembers]);

  const handlePriorityChange = (priorityId: string | null) => {
    if (!canEditMembers || isPriorityUpdating) return;
    if (priorityId === (card.priorityId ?? null)) {
      return;
    }
    setPriorityUpdating(true);
    const selectedPriority =
      priorityId === null
        ? null
        : priorityOptions.find((priority) => priority.id === priorityId) || null;
    setDisplayPriority(selectedPriority);
    updateCard(
      { priorityId },
      {
        onSettled: () => setPriorityUpdating(false),
      }
    );
  };

  const handlePrioritySelect: MenuProps["onClick"] = ({ key, domEvent }) => {
    domEvent?.stopPropagation();
    const nextPriorityId = key === "__no_priority__" ? null : key;
    handlePriorityChange(nextPriorityId);
  };

  const showPriorityControl = canEditMembers || !!displayPriority;

  return (
    <div className="w-full">
      {/* Cover image */}
      {card?.cover && (
        <div className="w-full bg-white">
          <div
            className="relative bg-gray-100 bg-center bg-no-repeat h-36 flex justify-end items-end rounded-t-lg"
            style={{
              backgroundImage: card?.cover ? `url("${card?.cover}")` : "none",
              backgroundSize: "contain",
            }}
          ></div>
        </div>
      )}

      {/* Status color bar */}
      {/* { selectedCard?.labels && (
        <div className="flex h-1 w-full mb-3">
          <div className="bg-green-500 w-1/3"></div>
          <div className="bg-yellow-400 w-1/3"></div>
          <div className="bg-orange-400 w-1/3"></div>
        </div>
      ) } */}

      {/* Card content */}
      <div className="p-4">
        {/* Main Card link */}
        {card?.mirrorId && (
          <TouchAwareTooltip
            title={`${card?.sourceCard?.boardName}: ${card?.sourceCard?.listName}`}
          >
            <div className="flex justify-between items-center rounded bg-gray-100 group hover:bg-gray-200">
              <div className="flex items-center gap-2 p-2">
                <Avatar shape="square" size={"small"}>
                  <span>{card?.sourceCard?.name?.charAt(0) || ""}</span>
                </Avatar>
                <div className="text-[10px] flex flex-col">
                  <div className="flex gap-1 items-center">
                    <span className="font-semibold">
                      {card?.sourceCard?.boardName}
                    </span>
                    <MoveUpRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                  <span>{card?.sourceCard?.listName}</span>
                </div>
              </div>
            </div>
          </TouchAwareTooltip>
        )}

        {/* Labels */}
        {cardLabels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cardLabels.map((label: CardLabel) => {
              const bg = label.value || "#CCCCCC";
              const textColor = getContrastTextColor(bg);
              return (
                <span
                  key={label.labelId || label.id}
                  className="px-[6px] py-[2px] rounded leading-none text-[10px] font-medium"
                  style={{
                    backgroundColor: bg,
                    color: textColor,
                  }}
                >
                  {label.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Card title */}
        <div className="flex items-center space-x-2 relative mb-3">
          <Checkbox
            className={`custom-circular-checkbox absolute left-0 -ml-6 ${
              isHovered || card?.isComplete ? "opacity-100" : "opacity-0"
            } ${card?.isComplete ? "completed" : ""}`}
            checked={card?.isComplete}
            onChange={(e) => onCompletionChange(e, card)}
            onClick={(e) => e.stopPropagation()}
          />

          <h3
            className={`
              text-blue-800 font-semibold text-lg
              ${
                isHovered || card?.isComplete
                  ? "translate-x-6"
                  : "translate-x-0"
              }
            `}
          >
            {card.name}
          </h3>
        </div>

        {showPriorityControl && (
          <div className="mb-2 -mt-2" onClick={(e) => e.stopPropagation()}>
            {canEditMembers ? (
              <Dropdown
                menu={{
                  items: priorityMenuItems,
                  onClick: handlePrioritySelect,
                }}
                trigger={["click"]}
                disabled={prioritiesQuery.isLoading}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-left"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isPriorityUpdating || prioritiesQuery.isLoading}
                >
                  <PriorityFlag priority={displayPriority} />
                  <ChevronDown size={12} className="text-gray-500" />
                </button>
              </Dropdown>
            ) : (
              <div
                className="inline-flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <PriorityFlag priority={displayPriority} />
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        {card?.startDate && (
          <div className="mb-2">
            <TouchAwareTooltip title={"Dates"}>
              <div className="flex items-center gap-1 text-[10px]">
                <Clock size={12} strokeWidth={2} />
                <CardDateDisplay card={card} />
              </div>
            </TouchAwareTooltip>
          </div>
        )}

        {/* Time tracking information */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="flex items-center gap-1 text-[10px]">
              <Calendar size={12} />
              <span className="text-[10px]">
                {formatTimeShort(card?.formattedTimeInBoard)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <CalendarDays size={12} />
              <span className="text-[10px]">
                {formatTimeShort(card?.formattedTimeInList)}
              </span>
            </div>
          </div>
        </div>

        {/* Icons row */}
        <div className="flex items-center gap-4 text-gray-600 mb-3">
          <div className="flex items-center gap-1 text-[10px]">
            <TouchAwareTooltip
              title={
                card?.description
                  ? "this card has description"
                  : "no description"
              }
            >
              <Text size={12} strokeWidth={3} />
            </TouchAwareTooltip>
          </div>
          <TouchAwareTooltip title={"comments"}>
            <div className="flex items-center gap-1 text-[10px]">
              <MessageSquare size={12} strokeWidth={2} className="font-bold" />
              <span className="text-sm">{card?.activity?.length || 0}</span>
            </div>
          </TouchAwareTooltip>
          <TouchAwareTooltip title={"attachments"}>
            <div className="flex items-center gap-1 text-[10px]">
              <Paperclip size={12} strokeWidth={2} />
              <span className="text-sm">{card?.attachments?.length || 0}</span>
            </div>
          </TouchAwareTooltip>
          {/* <div className="text-green-600 text-[14px]">
            Cabang: {card.location}
          </div> */}
        </div>

        {/* Custom fields */}
        <div className="space-y-2 mb-3">
          {cardCustomFields?.map((item: CardCustomField, index) => {
            if (!item.isShowAtFront) return null;

            const renderValue = () => {
              if (item.type === "date") {
                return item.valueDate
                  ? dayjs(item.valueDate).format("DD/MM/YY")
                  : "-";
              }

              if (item.type === "checkbox") {
                if (
                  item.valueCheckbox === undefined ||
                  item.valueCheckbox === null
                )
                  return "-";
                return item.valueCheckbox ? "Yes" : "No";
              }

              if (item.valueUserId) {
                const name =
                  LookupCache.label("user", item.valueUserId) ||
                  LookupCache.any(item.valueUserId);
                return name || "-";
              }

              // Prioritize correct value type based on custom field type
              if (item.type === "number") {
                if (
                  item.valueNumber !== null &&
                  item.valueNumber !== undefined
                ) {
                  // Format number with separators
                  return typeof item.valueNumber === "number"
                    ? item.valueNumber.toLocaleString()
                    : parseFloat(item.valueNumber).toLocaleString();
                }
              } else if (item.type === "dropdown") {
                if (
                  item.valueOption !== null &&
                  item.valueOption !== undefined
                ) {
                  return LookupCache.any(item.valueOption);
                }
              } else if (item.type === "text") {
                if (
                  item.valueString !== null &&
                  item.valueString !== undefined
                ) {
                  return item.valueString;
                }
              }

              // Fallback to original order for other types or if primary value is null
              if (item.valueOption !== null && item.valueOption !== undefined) {
                return item.valueOption;
              }
              if (item.valueString !== null && item.valueString !== undefined) {
                return item.valueString;
              }
              if (item.valueNumber !== null && item.valueNumber !== undefined) {
                // Format number with separators for fallback case too
                return typeof item.valueNumber === "number"
                  ? item.valueNumber.toLocaleString()
                  : parseFloat(item.valueNumber).toLocaleString();
              }
              return "-";
            };

            const valueToShow = renderValue();
            if (valueToShow === "-" || valueToShow === undefined) return null;

            return (
              <div
                key={`${card.id}-field-${index}`}
                className="text-gray-700 text-[11px]"
              >
                <span className="font-medium mr-1">{item.name}:</span>
                {valueToShow}
              </div>
            );
          })}
        </div>

        {cardMembers && (
          <div
            className="flex mt-2 gap-1 justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <MembersList
              members={cardMembers}
              membersLength={cardMembers?.length}
              membersLoopLimit={3}
              onRemoveMember={canEditMembers ? removeMember : undefined}
              openAddMember={canEditMembers ? openAddMember : undefined}
              setOpenAddMember={canEditMembers ? setOpenAddMember : undefined}
              onUserSelectionChange={
                canEditMembers
                  ? (value: string) => {
                      if (!value) return;
                      addMember(value);
                      setOpenAddMember(false);
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RegularCard;

import { CardDateDisplay } from "@components/card-dates";
import MembersList from "@components/members-list";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useCardMembers } from "@hooks/card_member";
import { Card, CardCustomField } from "@myTypes/card";
import { isImageFile } from "@utils/file";
import { Avatar, Checkbox, CheckboxChangeEvent, Typography } from "antd";
import TouchAwareTooltip from "@components/touch-aware-tooltip";
import {
  Calendar,
  CalendarDays,
  CheckSquare,
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
  loadRelatedData?: boolean;
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

function normalizeCardCustomFields(
  fields: CardCustomField[] | undefined
): CardCustomField[] {
  if (!fields?.length) return [];

  const dedupedFields = new Map<string, CardCustomField>();

  fields.forEach((field, index) => {
    const normalizedFieldBase: CardCustomField = {
      ...field,
      id: field.id ?? (field as any).custom_field_id,
      cardId: field.cardId ?? (field as any).card_id,
      name: field.name ?? (field as any).name,
      description: field.description ?? (field as any).description,
      source: field.source ?? (field as any).source,
      type: field.type ?? (field as any).type,
      options: field.options ?? (field as any).options,
      isShowAtFront:
        field.isShowAtFront ?? (field as any).is_show_at_front,
      valueString: field.valueString ?? (field as any).value_string,
      valueNumber: field.valueNumber ?? (field as any).value_number,
      valueOption: field.valueOption ?? (field as any).value_option,
      valueCheckbox: field.valueCheckbox ?? (field as any).value_checkbox,
      valueDate: field.valueDate ?? (field as any).value_date,
      valueUserId: field.valueUserId ?? (field as any).value_user_id,
    };

    const rawDateValue =
      normalizedFieldBase.type === "date"
        ? normalizedFieldBase.valueDate ??
          normalizedFieldBase.valueString
        : undefined;

    const normalizedField = rawDateValue
      ? {
          ...normalizedFieldBase,
          valueDate: (normalizedFieldBase.valueDate ?? rawDateValue) as any,
        }
      : normalizedFieldBase;

    const key =
      (field as any).customFieldId ||
      (field as any).custom_field_id ||
      normalizedField.id ||
      (normalizedField.name
        ? `name:${normalizedField.name.toLowerCase()}`
        : `index:${index}`);

    if (!dedupedFields.has(key)) {
      dedupedFields.set(key, normalizedField);
    }
  });

  return Array.from(dedupedFields.values());
}

const RegularCard: React.FC<RegularCardProps> = (props) => {
  const {
    card,
    isHovered,
    onCompletionChange,
    isDragging = false,
    loadRelatedData = true,
  } = props;
  const { workspaceId } = useParams();
  const isTempCard = card?.id?.startsWith("temp-card");

  const embeddedCardMembers = useMemo(() => card.members ?? [], [card.members]);
  const embeddedCardLabels = useMemo<CardLabel[]>(
    () =>
      (card.labels ?? []).map((label: any) => ({
        ...label,
        labelId: label.labelId ?? label.id,
      })),
    [card.labels]
  );
  const embeddedCardCustomFields = useMemo(
    () =>
      normalizeCardCustomFields(
        (card.customFields ?? (card as any).custom_fields) as
          | CardCustomField[]
          | undefined
      ),
    [card.customFields, (card as any).custom_fields]
  );
  const shouldFetchCustomFields =
    !isTempCard && loadRelatedData && embeddedCardCustomFields.length === 0;

  const { cardMembers: fetchedCardMembers } = useCardMembers(card?.id, {
    enabled: loadRelatedData && !isTempCard,
  });
  const { cardCustomFields: fetchedCardCustomFields } = useCardCustomField(
    card.id,
    workspaceId as string,
    {
      enabled: shouldFetchCustomFields,
    }
  );
  // local version state to force re-render after lookups populate
  const [lookupVersion, setLookupVersion] = useState(0);

  // Fetch labels assigned to this card
  const { cardLabels: fetchedCardLabels } = useLabels(
    Array.isArray(workspaceId)
      ? (workspaceId[0] as string)
      : (workspaceId as string),
    card.id,
    { cardId: card.id },
    { enabled: loadRelatedData && !isTempCard }
  );

  const cardMembers = !loadRelatedData
    ? embeddedCardMembers
    : fetchedCardMembers?.length
      ? fetchedCardMembers
      : embeddedCardMembers;
  const cardLabels = !loadRelatedData
    ? embeddedCardLabels
    : fetchedCardLabels?.length
      ? fetchedCardLabels
      : embeddedCardLabels;
  const cardCustomFields = !loadRelatedData
    ? fetchedCardCustomFields?.length
      ? fetchedCardCustomFields
      : embeddedCardCustomFields
    : fetchedCardCustomFields?.length
      ? fetchedCardCustomFields
      : embeddedCardCustomFields;

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

  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverError, setCoverError] = useState(false);

  // Reset cover state when card cover URL changes
  useEffect(() => {
    setCoverLoaded(false);
    setCoverError(false);
  }, [card?.cover]);

  return (
    <div className="w-full">
      {/* Cover image */}
      {card?.cover && !coverError && (
        <div className="w-full bg-white">
          <div className="relative bg-gray-100 rounded-t-lg overflow-hidden h-36">
            {!coverLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={card.cover}
              alt=""
              loading="lazy"
              onLoad={() => setCoverLoaded(true)}
              onError={() => setCoverError(true)}
              className={`w-full h-full object-contain transition-opacity duration-200 ${
                coverLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
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
                  className="px-2 py-1 rounded leading-none"
                  style={{
                    backgroundColor: bg,
                    color: textColor,
                    fontSize: "12px",
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
              <span className="text-sm">{card?.commentCount || 0}</span>
            </div>
          </TouchAwareTooltip>
          <TouchAwareTooltip title={"attachments"}>
            <div className="flex items-center gap-1 text-[10px]">
              <Paperclip size={12} strokeWidth={2} />
              <span className="text-sm">{card?.attachmentCount || 0}</span>
            </div>
          </TouchAwareTooltip>
          <TouchAwareTooltip title={"checklists"}>
            <div className="flex items-center gap-1 text-[10px]">
              <CheckSquare size={12} strokeWidth={2} />
              <span className="text-sm">
                {card?.checklistDone || 0} / {card?.checklistTotal || 0}
              </span>
            </div>
          </TouchAwareTooltip>
          {/* <div className="text-green-600 text-[14px]">
            Cabang: {card.location}
          </div> */}
        </div>

        {/* Product Information */}
        <div className="space-y-1 mb-3">
          {card?.productInfo?.name && (
            <div className="text-gray-700 text-[11px]">
              <span className="font-medium mr-1">Produk:</span>
              {card.productInfo.name}
            </div>
          )}
          {card?.productCodeInfo?.code && (
            <div className="text-gray-700 text-[11px]">
              <span className="font-medium mr-1">Kode Produk:</span>
              {card.productCodeInfo.code}
            </div>
          )}
          {card?.bahanInfo?.name && (
            <div className="text-gray-700 text-[11px]">
              <span className="font-medium mr-1">Bahan:</span>
              {card.bahanInfo.name}
            </div>
          )}
          {card?.warnaInfo?.name && (
            <div className="text-gray-700 text-[11px]">
              <span className="font-medium mr-1">Warna:</span>
              {card.warnaInfo.name}
            </div>
          )}
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
          <div className="flex mt-2 gap-1 justify-end">
            <MembersList
              members={cardMembers}
              membersLength={cardMembers?.length}
              membersLoopLimit={3}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RegularCard;

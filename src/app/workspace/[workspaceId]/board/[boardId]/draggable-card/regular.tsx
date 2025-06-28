import { CardDateDisplay } from "@components/card-dates";
import MembersList from "@components/members-list";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useCardMembers } from "@hooks/card_member";
import { Card, CardCustomField } from "@myTypes/card";
import { isImageFile } from "@utils/file";
import { Checkbox, CheckboxChangeEvent, Tooltip } from "antd";
import {
  Calendar,
  CalendarDays,
  Clock,
  MessageSquare,
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

interface RegularCardProps {
  card: Card;
  isHovered: boolean;
  onChange: (e: CheckboxChangeEvent) => void;
  isComplete: boolean;
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
  const { card, isHovered, onChange, isComplete } = props;
  const { workspaceId } = useParams();
  const { cardMembers } = useCardMembers(card?.id);
  const { cardCustomFields } = useCardCustomField(
    card.id,
    workspaceId as string
  );
  const [frontCustomFields, setfrontCustomFields] = useState<CardCustomField[]>(
    []
  );
  const { cardAttachments } = useCardAttachment(card.id);
  // local version state to force re-render after lookups populate
  const [lookupVersion, setLookupVersion] = useState(0);

  // Fetch labels assigned to this card
  const { cardLabels } = useLabels(
    Array.isArray(workspaceId)
      ? (workspaceId[0] as string)
      : (workspaceId as string),
    card.id,
    { cardId: card.id }
  );

  useEffect(() => {
    if (cardCustomFields) {
      const filtered = cardCustomFields.filter((item) => item.isShowAtFront);
      setfrontCustomFields(filtered);
    }
  }, cardCustomFields);

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

  const imageCover = useMemo(() => {
    let url = "";

    if (card.cover) {
      url = card.cover;
      return url;
    }

    cardAttachments.forEach((item) => {
      if (item.file) {
        const isImage = isImageFile(item.file.name, item.file.mimeType);

        if (isImage) {
          url = item.file.url;
          return url;
        }
      }
    });

    return url;
  }, [cardAttachments, card]);

  return (
    <div className="w-full">
      {/* Cover image */}
      {imageCover && (
        <div className="w-full bg-white">
          <div
            className="relative bg-gray-100 bg-center bg-no-repeat h-36 flex justify-end items-end rounded-t-lg"
            style={{
              backgroundImage: imageCover ? `url("${imageCover}")` : "none",
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
            className={`custom-circular-checkbox absolute left-0 -ml-6 transition-all duration-300 ${
              isHovered || isComplete ? "opacity-100" : "opacity-0"
            } ${isComplete ? "completed" : ""}`}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            checked={isComplete}
          />
          <h3
            className={`
              text-blue-800 font-semibold text-lg
              transition-all duration-300
              ${isHovered || isComplete ? "translate-x-6" : "translate-x-0"}
            `}
          >
            {card.name}
          </h3>
        </div>

        {/* Dates */}
        {card?.startDate && (
          <div className="mb-2">
            <Tooltip title={"Dates"}>
              <div className="flex items-center gap-1 text-[10px]">
                <Clock size={12} strokeWidth={2} />
                <CardDateDisplay card={card} />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Time tracking information */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="flex items-center gap-1 text-[10px]">
              <Calendar size={12} />
              <span className="text-[10px]">
                {card?.formattedTimeInBoard || "--"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <CalendarDays size={12} />
              <span className="text-[10px]">
                {card?.formattedTimeInList || "--"}
              </span>
            </div>
          </div>
        </div>

        {/* Icons row */}
        <div className="flex items-center gap-4 text-gray-600 mb-3">
          <div className="flex items-center gap-1 text-[10px]">
            <Tooltip
              title={
                card?.description
                  ? "this card has description"
                  : "no description"
              }
            >
              <Text size={12} strokeWidth={3} />
            </Tooltip>
          </div>
          <Tooltip title={"comments"}>
            <div className="flex items-center gap-1 text-[10px]">
              <MessageSquare size={12} strokeWidth={2} className="font-bold" />
              <span className="text-sm">{card?.activity?.length || 0}</span>
            </div>
          </Tooltip>
          <Tooltip title={"attachments"}>
            <div className="flex items-center gap-1 text-[10px]">
              <Paperclip size={12} strokeWidth={2} />
              <span className="text-sm">{card?.attachments?.length || 0}</span>
            </div>
          </Tooltip>
          {/* <div className="text-green-600 text-[14px]">
            Cabang: {card.location}
          </div> */}
        </div>

        {/* Custom fields */}
        <div className="space-y-2 mb-3">
          {cardCustomFields?.map((item: CardCustomField, index) => {
            console.log(item, "<< ini item");
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

              // dropdown or text/number fallback
              return (
                item.valueOption || item.valueString || item.valueNumber || "-"
              );
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

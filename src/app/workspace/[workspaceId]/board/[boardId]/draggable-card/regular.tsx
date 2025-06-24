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

interface RegularCardProps {
  card: Card;
  isHovered: boolean;
  onChange: (e: CheckboxChangeEvent) => void;
  isComplete: boolean;
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

  useEffect(() => {
    if (cardCustomFields) {
      const filtered = cardCustomFields.filter((item) => item.isShowAtFront);
      setfrontCustomFields(filtered);
    }
  }, cardCustomFields);

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
        {/* Card title */}
        <div className="flex items-center space-x-2 relative mb-3">
          {isHovered && (
            <Checkbox
              className="custom-circular-checkbox absolute left-0 -ml-6 
                          transition-all duration-300"
              onChange={onChange}
              onClick={(e) => e.stopPropagation()}
              checked={isComplete}
            />
          )}
          <h3
            className={`
              text-blue-800 font-semibold text-lg
              transition-all duration-300
              ${isHovered ? "translate-x-6" : "translate-x-0"}
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
          {cardCustomFields?.map(
            (item: CardCustomField, index) =>
              item.isShowAtFront &&
              (item.valueCheckbox ||
                item.valueDate ||
                item.valueNumber ||
                item.valueOption ||
                item.valueString ||
                item.valueUserId) && (
                <div
                  key={`${card.id}-field-${index}`}
                  className="text-gray-700 text-[11px]"
                >
                  <span className="font-medium">{item.name}:</span>
                  {item.valueUserId ||
                    item.valueString ||
                    item.valueNumber ||
                    item.valueOption ||
                    item.valueCheckbox ||
                    item?.valueDate?.toString() ||
                    "-"}
                </div>
              )
          )}
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

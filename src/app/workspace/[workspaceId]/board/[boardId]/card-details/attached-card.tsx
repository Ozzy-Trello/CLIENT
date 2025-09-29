import { useCardDetailContext } from "@providers/card-detail-context";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { CheckboxChangeEvent, Checkbox } from "antd";
import { useState } from "react";
import { useCardDetails } from "@hooks/card-details";
import { useParams } from "next/navigation";
import { Button } from "antd";
import { MessageSquare, Paperclip, Text, Calendar, CalendarDays, Clock, Unlink } from "lucide-react";
import TouchAwareTooltip from "@components/touch-aware-tooltip";
import MembersList from "@components/members-list";
import { CardDateDisplay } from "@components/card-dates";

interface AttachedCardProps {
  card: Card;
  onDelete?: () => void;
}

// Helper function to get contrast text color
function getContrastTextColor(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

const AttachedCard: React.FC<AttachedCardProps> = ({ card, onDelete }) => {
  const { openCardDetail } = useCardDetailContext();
  const { boardId } = useParams();
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { completeCard, incompleteCard } = useCardDetails(
    card.listId,
    card.id,
    boardId as string
  );

  // Handle missing card data
  if (!card || !card.id) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-200 p-4 min-h-[120px] flex items-center justify-center">
        <span className="text-gray-500 text-sm">Card data unavailable</span>
      </div>
    );
  }

  const onChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    const isComplete = e.target.checked;
    if (isComplete) {
      completeCard({ listId: card?.listId, cardId: card.id });
    } else {
      incompleteCard({ listId: card?.listId, cardId: card.id });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (
        e.target.className.includes("checkbox") ||
        e.target.closest(".delete-attachment-btn")
      ) {
        return;
      }
    }

    // Create a mock list object since we don't have the actual list data
    const mockList: AnyList = {
      id: card.listId,
      name: "Unknown List",
      boardId: boardId as string,
    };

    openCardDetail(card, mockList);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 
        w-full relative group cursor-pointer
        hover:border-blue-500 transition-all duration-200
        ${isHovered ? "shadow-md" : ""}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-card-id={card.id}
    >
      {/* Delete button - visible on hover */}
      {onDelete && (
        <Button
          className="delete-attachment-btn absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          icon={<Unlink size={14} />}
          size="small"
          danger
          onClick={handleDelete}
          title="Unlink card"
        />
      )}

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

      {/* Card content */}
      <div className="p-4">
        {/* Labels */}
        {card?.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label, index) => {
              const bg = label?.color || "#CCCCCC";
              const textColor = getContrastTextColor(bg);
              return (
                <span
                  key={index}
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
            onChange={onChange}
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
        </div>

        {/* Members */}
        {card?.members && card.members.length > 0 && (
          <div className="flex mt-2 gap-1 justify-end">
            <MembersList
              members={card.members}
              membersLength={card.members?.length}
              membersLoopLimit={3}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachedCard;
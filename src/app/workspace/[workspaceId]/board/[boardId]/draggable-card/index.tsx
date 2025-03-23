import { cards } from "@/app/api/card";
import MembersList from "@/app/components/members-list";
import { AnyList, Card } from "@/app/dto/types";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { Draggable, DroppableProvided } from "@hello-pangea/dnd";
import { Checkbox, CheckboxProps, Tooltip } from "antd";
import { Calendar, CalendarDays, MessageSquare, Paperclip, Text } from "lucide-react";
import { useState } from "react";

interface DraggableCardProps {
  card: Card;
  index: number;
  list: AnyList;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  card, 
  index, 
  list,
}) => {

  const {selectedCard, isCardDetailOpen, openCardDetail, closeCardDetail } = useCardDetailContext();
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  
  const onChange: CheckboxProps['onChange'] = (e) => {
    e.stopPropagation();
    setIsComplete(e.target.checked);
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided) => (
        <div
          className="bg-white rounded-lg border border-gray-200 hover:border-blue-500
           transition-all duration-300 overflow-hidden cursor-move"
          ref={provided.innerRef}
          {...provided.dragHandleProps}
          {...provided.draggableProps}
          onClick={() => {openCardDetail(card)}}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Cover image */}
          {card.cover?.url && (
            <div className="w-full bg-white border-b mb-3">
              <div className="relative">
                <img
                  src={card.cover.url}
                  alt=""
                  className="w-full object-contain"
                />
              </div>
            </div>
          )}
          
          {/* Status color bar */}
          { selectedCard?.labels && (
            <div className="flex h-1 w-full mb-3">
              <div className="bg-green-500 w-1/3"></div>
              <div className="bg-yellow-400 w-1/3"></div>
              <div className="bg-orange-400 w-1/3"></div>
            </div>
          ) }
       
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
              <h3 className={`
                  text-blue-800 font-semibold text-lg
                  transition-all duration-300
                  ${isHovered ? 'translate-x-6' : 'translate-x-0'}
                `}>
                {card.name}
              </h3>
            </div>
         
            {/* Icons row */}
            <div className="flex items-center gap-4 text-gray-600 mb-3">
              <div className="flex items-center gap-1 text-[10px]">
                <Tooltip title={card?.description ? "this card has description" : "no description"}>
                  <Text size={13} strokeWidth={3} />
                </Tooltip>
              </div>
              <Tooltip title={"comments"}>
                <div className="flex items-center gap-1 text-[10px]">
                  <MessageSquare size={13} strokeWidth={2} className="font-bold" />
                  <span className="text-sm">{card?.activity?.length || 0}</span>
                </div>
              </Tooltip>
              <Tooltip title={"attachments"}>
                <div className="flex items-center gap-1 text-[10px]">
                  <Paperclip size={13} strokeWidth={2} />
                  <span className="text-sm">{card?.attachments?.length || 0}</span>
                </div>
              </Tooltip>
              <div className="text-green-600 text-[14px]">
                Cabang: {card.location}
              </div>
            </div>
         
            {/* Custom fields */}
            <div className="space-y-2 mb-3">
              {card?.customFields?.map((item, index) => (
                <div key={`${card.id}-field-${index}`} className="text-gray-700 text-[11px]">
                  <span className="font-medium">{item.name}:</span> {item.value?.displayValue}
                </div>
              ))}
            </div>
         
            {/* Date information */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex items-center gap-1 text-[10px]">
                  <Calendar size={13} />
                  <span className="text-[10px]">{card?.time?.inList}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <CalendarDays size={13} />
                  <span className="text-[10px]">{card?.time?.onBoard}</span>
                </div>
              </div>
           
              {/* Status badges */}
              {card?.members && (
                <div className="flex gap-1">
                  <MembersList members={card.members} membersLength={card?.members?.length} membersLoopLimit={3} />
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default DraggableCard;
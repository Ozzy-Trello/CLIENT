import MembersList from "@components/members-list";
import { Card } from "@myTypes/card";
import { Checkbox, CheckboxChangeEvent, Tooltip } from "antd";
import { Calendar, CalendarDays, MessageSquare, Paperclip, Text } from "lucide-react";

interface RegularCardProps {
  card: Card;
  isHovered: boolean;
  onChange: (e: CheckboxChangeEvent) => void;
  isComplete: boolean;
}

const RegularCard:React.FC<RegularCardProps> = (props) => {
  const { card, isHovered, onChange, isComplete } = props;

  return (
    <div className="w-full">
      {/* Cover image */}
      {card.cover && (
        <div className="w-full bg-white">
          <div className="relative bg-gray-100 bg-center bg-no-repeat h-36 flex justify-end items-end rounded-t-lg"
            style={{
              backgroundImage: card.cover ? `url("${card.cover}")` : 'none',
              backgroundSize: 'contain'
            }}
          >
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
          {/* <div className="text-green-600 text-[14px]">
            Cabang: {card.location}
          </div> */}
        </div>
      
        {/* Custom fields */}
        <div className="space-y-2 mb-3">
          {card?.customFields?.map((item, index) => (
            <div key={`${card.id}-field-${index}`} className="text-gray-700 text-[11px]">
              <span className="font-medium">{item.name}:</span> {item.value}
            </div>
          ))}
        </div>
      
        {/* Date information */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-600">
            <div className="flex items-center gap-1 text-[10px]">
              <Calendar size={13} />
              <span className="text-[10px]">{card?.formattedTimeInBoard || "--"}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <CalendarDays size={13} />
              <span className="text-[10px]">{card?.formattedTimeInList || "--"}</span>
            </div>
          </div>
        
          {/* Status badges */}
          {/* {card?.members && (
            <div className="flex gap-1">
              <MembersList members={card.members} membersLength={card?.members?.length} membersLoopLimit={3} openAddMember={openAddMember} setOpenAddMember={setOpenAddMember}/>
            </div>
          )} */}
          
        </div>
      </div>
    </div>
  )
}

export default RegularCard;
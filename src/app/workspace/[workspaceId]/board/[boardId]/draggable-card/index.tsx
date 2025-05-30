
import { useCardDetailContext } from "@providers/card-detail-context";
import { Card, EnumCardType } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { Draggable } from "@hello-pangea/dnd";
import { CheckboxProps } from "antd";
import { useState } from "react";
import RegularCard from "./regular";
import Dashcard from "./dashcard";

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

  const { openCardDetail } = useCardDetailContext();
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  
  const onChange: CheckboxProps['onChange'] = (e) => {
    e.stopPropagation();
    setIsComplete(e.target.checked);
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided) => (
        <div
          className="bg-white rounded-lg border border-gray-200 
            max-w-sm
          hover:border-blue-500 transition-all duration-300 overflow-hidden cursor-move"
          ref={provided.innerRef}
          {...provided.dragHandleProps}
          {...provided.draggableProps}
          onClick={() => {
            openCardDetail(card, list);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {card.type == EnumCardType.Dashcard ? (
            <Dashcard 
              card={card}
              isHovered={isHovered}
              onChange={onChange}
              isComplete={isComplete}
            />
          ) : (
            <RegularCard
              card={card}
              isHovered={isHovered}
              onChange={onChange}
              isComplete={isComplete}
            />
          )}
        </div>
      )}
    </Draggable>
  )
}

export default DraggableCard;
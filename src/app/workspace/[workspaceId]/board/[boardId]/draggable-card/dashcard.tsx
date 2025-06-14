import { Card } from "@myTypes/card";
import { Checkbox, CheckboxChangeEvent, Typography } from "antd";
import { useDashcardCount } from "@hooks/dashcard";

interface DashcardProps {
  card: Card;
  isHovered: boolean;
  onChange: (e: CheckboxChangeEvent) => void;
  isComplete: boolean;
}

const Dashcard: React.FC<DashcardProps> = (props) => {
  const { card, isHovered, onChange, isComplete } = props;

  // Use our custom hook to fetch and manage dashcard count
  const { count } = useDashcardCount(card.id);

  return (
    <div
      className="w-full p-2"
      style={{
        background: card?.dashConfig?.backgroundColor,
      }}
    >
      <Typography.Title className="text-center">{count}</Typography.Title>
      <div className="">
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
              font-semibold text-lg
              transition-all duration-300
              ${isHovered ? "translate-x-6" : "translate-x-0"}
            `}
          >
            {card.name}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Dashcard;

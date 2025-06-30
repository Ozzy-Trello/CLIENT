import { Card } from "@myTypes/card";
import { Checkbox, CheckboxChangeEvent, Typography } from "antd";
import { useDashcardCount } from "@hooks/dashcard";
import "./styles.css";

interface DashcardProps {
  card: Card;
  isHovered: boolean;
  onCompletionChange: (e: CheckboxChangeEvent, card: Card) => void;
}

// util to lighten color toward white
const lighten = (hex: string, amount = 0.8) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);
  return `rgb(${newR}, ${newG}, ${newB})`;
};

const Dashcard: React.FC<DashcardProps> = (props) => {
  const { card, isHovered, onCompletionChange } = props;

  // Use our custom hook to fetch and manage dashcard count
  const { count } = useDashcardCount(card.id);

  return (
    <div
      className="w-full p-3 rounded-lg"
      style={{
        backgroundImage: card?.dashConfig?.backgroundColor
          ? `linear-gradient(180deg, ${
              card.dashConfig.backgroundColor
            } 0%, ${lighten(card.dashConfig.backgroundColor, 1)} 110%)`
          : undefined,
        backgroundColor: card?.dashConfig?.backgroundColor,
        minHeight: "110px",
        paddingBlock: "1rem",
      }}
    >
      <Typography.Title className="text-center">{count}</Typography.Title>
      <div className="">
        <div className="flex items-center space-x-2 relative mt-5">
          {/* Checkbox: visible on hover or when completed */}
          <Checkbox
            className={`custom-circular-checkbox absolute left-0 -ml-6 transition-all duration-300 ${
              isHovered || card?.isComplete ? "opacity-100" : "opacity-0"
            } ${card?.isComplete ? "completed" : ""}`}
            checked={card?.isComplete}
            onChange={(e) => onCompletionChange(e, card)}
            onClick={(e) => e.stopPropagation()}
          />
          <h3
            className={`
              font-semibold text-xl
              transition-all duration-300
              ${isHovered || card?.isComplete ? "translate-x-6" : "translate-x-0"}
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

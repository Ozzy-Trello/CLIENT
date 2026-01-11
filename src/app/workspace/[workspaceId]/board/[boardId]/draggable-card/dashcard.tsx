import { Card } from "@myTypes/card";
import { Checkbox, CheckboxChangeEvent, Typography } from "antd";
import { useSelector } from "react-redux";
import { selectIsDarkMode } from "@store/app_slice";
import { useParams } from "next/navigation";
import { useBoardFullStore } from "@store/board-full-store";
import { useDashcardCountStore } from "@store/dashcard-count-store";
import "./styles.css";
import { useEffect } from "react";

interface DashcardProps {
  card: Card;
  boardId?: string;
  isHovered: boolean;
  onCompletionChange: (e: CheckboxChangeEvent, card: Card) => void;
  isDragging?: boolean;
}

// util to lighten color toward white (light mode)
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

// util to darken color toward black (dark mode)
const darken = (hex: string, amount = 0.8) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const newR = Math.round(r * (1 - amount));
  const newG = Math.round(g * (1 - amount));
  const newB = Math.round(b * (1 - amount));
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// theme-aware fade function
const getFadeColor = (hex: string, isDarkMode: boolean, amount = 0.8) => {
  return isDarkMode ? darken(hex, amount) : lighten(hex, amount);
};

const Dashcard: React.FC<DashcardProps> = (props) => {
  const { card, boardId: boardIdProp, isHovered, onCompletionChange, isDragging = false } = props;
  const isDarkMode = useSelector(selectIsDarkMode);
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string | undefined);
  const boardId =
    boardIdProp ||
    (card as any).boardId ||
    (card as any).board_id ||
    (Array.isArray(params.boardId) ? params.boardId[0] : params.boardId);

  const dashcardIdKey = card.id.toLowerCase().replace(/-/g, "");

  const seededCount = useBoardFullStore((state) =>
    boardId
      ? state.boards[boardId]?.dashcardCounts?.[dashcardIdKey]
      : undefined
  );

  useEffect(() => {
    console.log("boards snapshot", useBoardFullStore.getState().boards);
  }, []);

  // Workspace-level fallback populated during board hydration
  const workspaceSeededCount = useDashcardCountStore((state) =>
    workspaceId ? state.getCount(workspaceId as string, card.id) : undefined
  );

  const rawCount =
    seededCount ??
    workspaceSeededCount ??
    (card as any).dashcardCount ??
    (card as any).dashcard_count ??
    0;
  const resolvedCount =
    typeof rawCount === "object" && rawCount !== null && "data" in rawCount
      ? (rawCount as any).data
      : rawCount;
  const count =
    typeof resolvedCount === "number"
      ? resolvedCount
      : typeof resolvedCount === "string"
        ? parseInt(resolvedCount, 10)
        : 0;

  // Calculate display value based on configuration
  const getDisplayValue = (): string => {
    const formatCount = () => {
      const numericCount =
        typeof count === "number"
          ? count
          : typeof count === "string"
            ? parseInt(count, 10)
            : 0;
      return numericCount.toLocaleString();
    };

    // Default to card count (also format with separators)
    return formatCount();
  };

  // Get display label based on configuration
  const getDisplayLabel = () => {
    return card?.dashConfig?.name || "Cards";
  };

  return (
    <div
      className="w-full p-3 rounded-lg"
      style={{
        backgroundImage: card?.dashConfig?.backgroundColor
          ? `linear-gradient(180deg, ${card.dashConfig.backgroundColor
          } 0%, ${getFadeColor(
            card.dashConfig.backgroundColor,
            isDarkMode,
            1
          )} 110%)`
          : undefined,
        backgroundColor: card?.dashConfig?.backgroundColor,
        minHeight: "110px",
        paddingBlock: "1rem",
      }}
    >
      <Typography.Title
        className="text-center"
        style={{ color: isDarkMode ? "white" : undefined }}
      >
        {getDisplayValue()}
      </Typography.Title>
      <div
        className="text-center text-sm opacity-75 -mt-2 mb-2"
        style={{ color: isDarkMode ? "white" : undefined }}
      >
        {getDisplayLabel()}
      </div>
      <div className="">
        <div className="flex items-center space-x-2 relative mt-5">
          {/* Checkbox: visible on hover or when completed */}
          <Checkbox
            className={`custom-circular-checkbox absolute left-0 -ml-6 ${isHovered || card?.isComplete ? "opacity-100" : "opacity-0"
              } ${card?.isComplete ? "completed" : ""}`}
            checked={card?.isComplete}
            onChange={(e) => onCompletionChange(e, card)}
            onClick={(e) => e.stopPropagation()}
          />
          <h3
            className={`
              text-blue-800 font-semibold text-lg
              ${isHovered || card?.isComplete
                ? "translate-x-6"
                : "translate-x-0"
              }
            `}
            style={{ color: isDarkMode ? "white" : undefined }}
          >
            {card.name}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Dashcard;

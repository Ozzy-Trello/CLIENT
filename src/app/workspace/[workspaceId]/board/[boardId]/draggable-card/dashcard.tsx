import { Card } from "@myTypes/card";
import { Checkbox, CheckboxChangeEvent, Typography } from "antd";
import { useDashcardCount } from "@hooks/dashcard";
import { useDashcardList } from "@hooks/dashcard-list";
import { useSelector } from "react-redux";
import { selectIsDarkMode } from "@store/app_slice";
import { DashcardDisplayType } from "@myTypes/dashcard";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { EnumCustomFieldType } from "@myTypes/custom-field";
import { memo } from "react";
import "./styles.css";

interface DashcardProps {
  card: Card;
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
  const { card, isHovered, onCompletionChange, isDragging = false } = props;
  const isDarkMode = useSelector(selectIsDarkMode);
  const { workspaceId } = useParams();
  const { customFields } = useCustomFields(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
  );

  // Use our custom hook to fetch and manage dashcard count
  const { count } = useDashcardCount(card.id, card.dashConfig);

  // Only fetch full item list when dashcard needs it (custom field sum display)
  // Regular count dashcards don't need items — avoids N parallel API calls
  const needsItems =
    card?.dashConfig?.displayConfig?.type === DashcardDisplayType.CUSTOM_FIELD_SUM;
  const { resultData } = useDashcardList(needsItems ? card : null);
  const items = resultData?.items || [];

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

    const displayConfig = card?.dashConfig?.displayConfig;

    if (
      displayConfig?.type === DashcardDisplayType.CUSTOM_FIELD_SUM &&
      displayConfig.customFieldId
    ) {
      // Find the custom field to get its name
      const customField = customFields?.find(
        (field) => field.id === displayConfig.customFieldId
      );
      if (!customField) return formatCount();

      // Calculate sum of the custom field using the field name
      const sum = items.reduce((total, item) => {
        const customFieldColumn = item.columns?.find(
          (col) => col.column === customField.name
        );
        if (!customFieldColumn) return total;

        const value = customFieldColumn.value;
        const numValue =
          typeof value === "string"
            ? parseFloat(value)
            : typeof value === "number"
            ? value
            : 0;
        return total + (isNaN(numValue) ? 0 : numValue);
      }, 0);

      // Format number with separators
      return Math.round(sum).toLocaleString();
    }

    // Default to card count (also format with separators)
    return formatCount();
  };

  // Get display label based on configuration
  const getDisplayLabel = () => {
    const displayConfig = card?.dashConfig?.displayConfig;

    if (
      displayConfig?.type === DashcardDisplayType.CUSTOM_FIELD_SUM &&
      displayConfig.customFieldId
    ) {
      const customField = customFields?.find(
        (field) => field.id === displayConfig.customFieldId
      );
      return customField ? `${customField.name} Total` : "Custom Field Total";
    }

    return "Cards";
  };

  return (
    <div
      className="w-full p-3 rounded-lg"
      style={{
        backgroundImage: card?.dashConfig?.backgroundColor
          ? `linear-gradient(180deg, ${
              card.dashConfig.backgroundColor
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
            style={{ color: isDarkMode ? "white" : undefined }}
          >
            {card.name}
          </h3>
        </div>
      </div>
    </div>
  );
};

const areDashcardPropsEqual = (
  prev: Readonly<DashcardProps>,
  next: Readonly<DashcardProps>
) => {
  return (
    prev.isHovered === next.isHovered &&
    prev.isDragging === next.isDragging &&
    prev.onCompletionChange === next.onCompletionChange &&
    prev.card.id === next.card.id &&
    prev.card.name === next.card.name &&
    prev.card.isComplete === next.card.isComplete &&
    prev.card.dashConfig?.backgroundColor ===
      next.card.dashConfig?.backgroundColor &&
    prev.card.dashConfig?.displayConfig?.type ===
      next.card.dashConfig?.displayConfig?.type &&
    prev.card.dashConfig?.displayConfig?.customFieldId ===
      next.card.dashConfig?.displayConfig?.customFieldId
  );
};

export default memo(Dashcard, areDashcardPropsEqual);

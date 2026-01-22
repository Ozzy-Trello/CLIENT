'use client';
import React, { useState, useEffect } from "react";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useSelector } from "react-redux";
import { selectTheme } from "@store/app_slice";
import {
  getCardButtonsForBoard,
  executeCardButton,
} from "@api/automation_rule";
import { useParams } from "next/navigation";
import { message, Tooltip } from "antd";
import { Zap } from "lucide-react";

interface CardButton {
  id: string;
  label: string;
  ruleId: string;
}

const AutomateButtons: React.FC = () => {
  const [cardButtons, setCardButtons] = useState<CardButton[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedCard, refetchCardDetails } = useCardDetailContext();
  const { workspaceId, boardId } = useParams();
  const theme = useSelector(selectTheme);
  const { colors } = theme;

  useEffect(() => {
    const fetchCardButtons = async () => {
      if (!workspaceId || !boardId) return;

      try {
        setLoading(true);
        const response = await getCardButtonsForBoard(
          workspaceId as string,
          boardId as string
        );

        const buttons: CardButton[] = (response.data || []).map(
          (rule: any) => ({
            id: rule.id,
            label:
              rule.condition?.buttonLabel || rule.condition?.label || "Button",
            ruleId: rule.id,
          })
        );

        setCardButtons(buttons);
      } catch (error) {
        // message.error("Failed to load automation buttons");
      } finally {
        setLoading(false);
      }
    };

    fetchCardButtons();
  }, [workspaceId, boardId]);

  const handleButtonClick = async (button: CardButton) => {
    if (!selectedCard?.id || !workspaceId || !boardId) {
      message.error("Missing required information to execute button");
      return;
    }

    try {
      setLoading(true);
      await executeCardButton(
        workspaceId as string,
        boardId as string,
        button.ruleId,
        selectedCard.id
      );
      message.success(`"${button.label}" executed successfully!`);
      // Refetch card details to update the UI
      refetchCardDetails();
    } catch (error) {
      message.error(`Failed to execute "${button.label}"`);
    } finally {
      setLoading(false);
    }
  };

  // Theme-aware button styles with yellowish background
  const buttonStyle = {
    backgroundColor: "#fef3c7", // Light yellow background
    color: `rgb(${colors.text})`,
    border: `1px solid #f59e0b`, // Yellow border
  };

  const iconStyle = {
    color: "#f59e0b", // Yellow/orange color for thunder icon
  };

  if (cardButtons.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-lg">
      {/* Card Buttons */}
      {cardButtons.map((button) => (
        <Tooltip key={button.id} title={`Execute automation: ${button.label}`}>
          <button
            onClick={() => handleButtonClick(button)}
            disabled={loading}
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 rounded-md transition-colors mb-1 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={buttonStyle}
          >
            <Zap size={14} style={iconStyle} />
            <span className="text-xs">{button.label}</span>
            {loading && <span className="text-xs ml-auto opacity-60">...</span>}
          </button>
        </Tooltip>
      ))}
    </div>
  );
};

export default AutomateButtons;

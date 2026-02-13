"use client";

import React, { useState, useEffect } from "react";
import { InputNumber } from "antd";
import { Check, X } from "lucide-react";
import { Card } from "@myTypes/card";
import { useCards } from "@hooks/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

interface POAmountProps {
  card: Card;
  setSelectedCard?: React.Dispatch<React.SetStateAction<Card | null>>;
}

const POAmount: React.FC<POAmountProps> = ({ card, setSelectedCard }) => {
  const [localValue, setLocalValue] = useState<number>(card.poAmount || 1);
  const [hasChanged, setHasChanged] = useState(false);
  const { updateCard, isUpdatingCard } = useCards(
    card.listId || "",
    card.boardId || ""
  );
  const { canUpdateCard } = useBoardPermissionsContext();

  // Update local value when card.poAmount changes
  // Only sync when a defined value arrives — ignore undefined during cache transitions
  // to prevent flickering between the real value and the fallback of 1
  useEffect(() => {
    if (card.poAmount !== undefined && card.poAmount !== null) {
      setLocalValue(card.poAmount);
      setHasChanged(false);
    }
  }, [card.poAmount]);

  const handleValueChange = (value: number | null) => {
    const newValue = value || 1;
    setLocalValue(newValue);
    setHasChanged(newValue !== (card.poAmount || 1));
  };

  const handleSave = () => {
    if (!canUpdateCard() || !hasChanged || isUpdatingCard) {
      return;
    }

    const valueToSave = Math.max(1, localValue);
    console.log("💾 [PO Amount] Saving:", { cardId: card.id, value: valueToSave });

    updateCard(
      {
        cardId: card.id,
        updates: {
          poAmount: valueToSave,
        },
      },
      {
        onSuccess: () => {
          console.log("✅ [PO Amount] Save SUCCESS");
          if (setSelectedCard) {
            setSelectedCard((prevCard) => {
              if (!prevCard) return prevCard;
              return {
                ...prevCard,
                poAmount: valueToSave,
              };
            });
          }
          setLocalValue(valueToSave);
          setHasChanged(false);
        },
        onError: () => {
          console.error("❌ [PO Amount] Save FAILED");
          setLocalValue(card.poAmount || 1);
          setHasChanged(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setLocalValue(card.poAmount || 1);
    setHasChanged(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hasChanged) {
      handleSave();
    } else if (e.key === "Escape" && hasChanged) {
      handleCancel();
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <span className="text-gray-300 font-semibold text-xs block">
        Jumlah PO
      </span>
      <div className="flex items-center gap-2">
        <InputNumber
          min={1}
          value={localValue}
          onChange={handleValueChange}
          onKeyDown={handleKeyDown}
          disabled={!canUpdateCard() || isUpdatingCard}
          size="small"
          className="w-20"
          controls={false}
        />
        {hasChanged && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={isUpdatingCard}
              className="p-1 rounded hover:bg-green-100 text-green-600 disabled:opacity-50"
              title="Save changes"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdatingCard}
              className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-50"
              title="Cancel changes"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default POAmount;

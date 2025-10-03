"use client";

import React, { useState, useEffect } from "react";
import { InputNumber } from "antd";
import { Check, X } from "lucide-react";
import { Card } from "@myTypes/card";
import { useCards } from "@hooks/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { autoCreatePOs } from "@api/po";

interface POAmountProps {
  card: Card;
  setSelectedCard?: React.Dispatch<React.SetStateAction<Card | null>>;
}

const POAmount: React.FC<POAmountProps> = ({ card, setSelectedCard }) => {
  const [localValue, setLocalValue] = useState<number>(card.poAmount || 1);
  const [hasChanged, setHasChanged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { updateCard } = useCards(card.listId || "", card.boardId || "");
  const { canUpdateCard } = useBoardPermissionsContext();

  // Update local value when card.poAmount changes
  useEffect(() => {
    setLocalValue(card.poAmount || 1);
    setHasChanged(false);
  }, [card.poAmount]);

  const handleValueChange = (value: number | null) => {
    const newValue = value || 1;
    setLocalValue(newValue);
    setHasChanged(newValue !== (card.poAmount || 1));
  };

  const handleSave = () => {
    if (!canUpdateCard() || !hasChanged || isLoading) {
      return;
    }

    setIsLoading(true);
    updateCard(
      {
        cardId: card.id,
        updates: {
          poAmount: localValue, // Send as camelCase, will be converted to snake_case by interceptor
        },
      },
      {
        onSuccess: async () => {
          try {
            // Update local state first
            if (setSelectedCard) {
              setSelectedCard((prevCard) => {
                if (!prevCard) return prevCard;
                return {
                  ...prevCard,
                  poAmount: localValue, // Update local state as camelCase
                };
              });
            }
            setHasChanged(false);

            await autoCreatePOs(card.id);
            setIsLoading(false);
          } catch (autoCreateError) {
            setIsLoading(false);
          }
        },
        onError: () => {
          // Reset to original value on error
          setLocalValue(card.poAmount || 1);
          setHasChanged(false);
          setIsLoading(false);
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
          disabled={!canUpdateCard() || isLoading}
          size="small"
          className="w-20"
          controls={false}
        />
        {hasChanged && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="p-1 rounded hover:bg-green-100 text-green-600 disabled:opacity-50"
              title="Save changes"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
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
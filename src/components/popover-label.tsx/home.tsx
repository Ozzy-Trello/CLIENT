"use client";

import React, { useState, useMemo } from "react";
import { Input, Button, Checkbox, Tooltip } from "antd";
import { Pencil } from "lucide-react";
import { CardLabel } from "@myTypes/label";
import { useParams } from "next/navigation";
import { Card } from "@myTypes/card";
import { useLabels } from "@hooks/label";

interface LabelManagerProps {
  popoverPage: "home" | "add" | "update";
  setPopoverPage: (page: "home" | "add" | "update") => void;
  selectedLabel: CardLabel | undefined;
  setSelectedLabel: (label: CardLabel | undefined) => void;
  selectedCard: Card | null;
}

const Home: React.FC<LabelManagerProps> = (props) => {
  const { workspaceId } = useParams();
  const { setPopoverPage, setSelectedLabel, selectedCard } = props;
  const [searchTerm, setSearchTerm] = useState("");

  const { cardLabels, addCardLabel, removeCardLabel } = useLabels(
    workspaceId as string,
    selectedCard?.id,
    { cardId: selectedCard?.id }
  );

  const filteredLabels: CardLabel[] = useMemo(() => {
    if (!cardLabels) return [];

    const unique: CardLabel[] = Array.from(
      new Map(cardLabels.map((l: CardLabel) => [l.labelId, l])).values()
    ) as CardLabel[];

    return unique.filter((label) =>
      label.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, cardLabels]);


  const toggleCheck = async (isChecked: boolean, labelId: string) => {
    if (!selectedCard || !workspaceId) {
      console.error("No card selected or workspace ID.");
      return;
    }

    try {
      if (isChecked) {
        addCardLabel({ labelId });
      } else {
        removeCardLabel({ labelId });
      }
    } catch (error) {
      console.error("Failed to update label assignment:", error);
    }
  };

  const handleEdit = (label: CardLabel) => {
    setSelectedLabel(label);
    setPopoverPage("update");
  };

  return (
    <div className="w-full">
      <Input
        placeholder="Search labels..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
        size="small"
      />

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filteredLabels.map((label: CardLabel) => (
          <div
            key={label.id}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
              label.isAssigned
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-gray-100 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2 flex-1">
              <Checkbox
                checked={!!label.isAssigned}
                onChange={(e) => {
                  if (label.labelId) {
                    toggleCheck(e.target.checked, label.labelId);
                  }
                }}
              />
              <div
                className="px-3 py-1 text-sm text-black rounded-sm font-medium flex-1"
                style={{ backgroundColor: label?.value }}
              >
                {label.name}
              </div>
            </div>
            <Tooltip title="Edit label">
              <button
                onClick={() => handleEdit(label)}
                className="p-1 hover:bg-gray-200 rounded-sm transition-colors ml-2"
              >
                <Pencil size={14} className="text-gray-500" />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button block size="small" onClick={() => setPopoverPage("add")}>
          Create a new label
        </Button>
        <Button block size="small" type="default">
          Show more labels
        </Button>
      </div>
    </div>
  );
};

export default Home;

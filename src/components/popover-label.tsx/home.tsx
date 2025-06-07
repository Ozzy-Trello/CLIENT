"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Input, Button, Checkbox, Tooltip } from "antd";
import { Pencil } from "lucide-react";
import { CardLabel, Label } from "@myTypes/label";
import { addCardLabel, getCardLabels, removeLabelFromCard } from "@api/card";
import { useParams } from "next/navigation";
import { Card } from "@myTypes/card";
import { getLabels } from "@api/label";
import { useLabels } from "@hooks/label";
import { useCardLabels } from "@hooks/card";

interface LabelManagerProps {
  popoverPage: 'home' | 'add' | 'update';
  setPopoverPage: (page: 'home' | 'add' | 'update') => void;
  selectedLabel: CardLabel | undefined;
  setSelectedLabel: any;
  selectedCard: Card | null;
}

const Home: React.FC<LabelManagerProps> = (props) => {
  const { workspaceId } = useParams();
  const { setPopoverPage, setSelectedLabel, selectedCard } = props;
  const [searchTerm, setSearchTerm] = useState("");
  // const [labels, setLabels] = useState<CardLabel[]>([]);
  const { labels } = useLabels(workspaceId as string, {cardId: selectedCard?.id});
  const { addLabel: addCardLabel, removeLabel: removeCardLabel } = useCardLabels(workspaceId as string, selectedCard?.id || "");

  const filteredLabels = useMemo(() => {
    if (labels) {
      return labels.filter(label =>
      label?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    }
  }, [searchTerm, labels]);

  const toggleCheck = async (isChecked: boolean, labelId: string) => {
    if (!selectedCard || !workspaceId) {
      console.error("No card selected, workspace ID, or label to assign to.");
      return;
    }

    // Optimistically update local state
    // setLabels((prevLabels) => {
    //   const updated = prevLabels?.map((label) =>
    //     label.labelId === labelId
    //       ? { ...label, isAssigned: isChecked }
    //       : label
    //   ) ?? [];
    //   console.log("Optimistically updated labels:", updated);
    //   return updated;
    // });

    try {
      if (isChecked) {
        addCardLabel(labelId);
      } else {
        removeCardLabel(labelId);
      }
    } catch (error) {
      console.error("Failed to update label assignment:", error);      
    }
  };

  const handleEdit = (label: CardLabel) => {
    setSelectedLabel(label);
    setPopoverPage('update');
  };

  return (
    <div className="w-64">
      <Input
        placeholder="Search labels..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
        size="small"
      />

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredLabels?.map((label) => (
          <div
            key={label.id}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
              label.isAssigned 
                ? "bg-blue-50 border border-blue-200" 
                : "hover:bg-gray-100 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!label.isAssigned}
                onChange={(e) => {
                  if (label.labelId) {
                    toggleCheck(e.target.checked, label.labelId);
                  }
                }}
              />
              <div
                className="px-2 py-0.5 text-sm text-black rounded"
                style={{ backgroundColor: label?.value }}
              >
                {label.name}
              </div>
            </div>
            <Tooltip title="Edit label">
              <button
                onClick={() => handleEdit(label)}
                className="p-1 hover:bg-gray-200 rounded-sm"
              >
                <Pencil size={14} className="text-gray-500" />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button block size="small" onClick={() => setPopoverPage('add')}>
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
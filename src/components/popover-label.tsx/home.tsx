"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input, Button, Checkbox, Tooltip } from "antd";
import { Pencil } from "lucide-react";
import { CardLabel } from "@myTypes/label";
import { useParams } from "next/navigation";
import { Card } from "@myTypes/card";
import { useLabels, useWorkspaceLabels } from "@hooks/label";

interface LabelManagerProps {
  popoverPage: "home" | "add" | "update";
  setPopoverPage: (page: "home" | "add" | "update") => void;
  selectedLabel: CardLabel | undefined;
  setSelectedLabel: (label: CardLabel | undefined) => void;
  selectedCard: Card | null;
}

const Home: React.FC<LabelManagerProps> = ({
  setPopoverPage,
  setSelectedLabel,
  selectedCard,
}) => {
  const { workspaceId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    labels: workspaceLabels,
    isFetching: isLoadingWorkspaceLabels,
    hasMore,
    loadMore,
    totalCount,
  } = useWorkspaceLabels(workspaceId as string, searchTerm);

  const { cardLabels, addCardLabel, removeCardLabel } = useLabels(
    workspaceId as string,
    selectedCard?.id,
    { cardId: selectedCard?.id }
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const labelsWithAssignment: CardLabel[] = useMemo(() => {
    if (!workspaceLabels) return [];

    return workspaceLabels.map((label) => ({
      ...label,
      isAssigned: cardLabels?.some(
        (cardLabel: CardLabel) => cardLabel.labelId === label.labelId
      ) || false,
    }));
  }, [workspaceLabels, cardLabels]);

  const toggleCheck = (isChecked: boolean, labelId: string) => {
    if (!selectedCard || !workspaceId) return;

    if (isChecked) {
      addCardLabel({ labelId });
    } else {
      removeCardLabel({ labelId });
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
        onChange={(e) => handleSearchChange(e.target.value)}
        className="mb-2"
        size="small"
      />

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {labelsWithAssignment.map((label) => (
          <div
            key={label.id}
            className={`flex items-center justify-between px-2 py-1 rounded transition ${
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
                style={{ backgroundColor: label.value }}
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

      {hasMore && (
        <div className="text-center pt-2">
          <Button
            size="small"
            type="text"
            onClick={loadMore}
            loading={isLoadingWorkspaceLabels}
          >
            Load more labels
          </Button>
        </div>
      )}

      {totalCount > 0 && (
        <div className="text-xs text-gray-500 text-center pt-1">
          Showing {labelsWithAssignment.length} of {totalCount} labels
        </div>
      )}

      <div className="mt-4">
        <Button block size="small" onClick={() => setPopoverPage("add")}>
          Create a new label
        </Button>
      </div>
    </div>
  );
};

export default Home;

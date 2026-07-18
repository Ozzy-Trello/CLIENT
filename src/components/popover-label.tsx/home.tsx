"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input, Button, Checkbox, Tooltip } from "antd";
import { Pencil, Sparkles } from "lucide-react";
import { CardLabel } from "@myTypes/label";
import { useParams } from "next/navigation";
import { Card } from "@myTypes/card";
import {
  useLabels,
  useTopWorkspaceLabels,
  useWorkspaceLabels,
} from "@hooks/label";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";

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
  const currentUser = useSelector(selectUser);
  const userRole = (currentUser?.role?.name || "").trim().toLowerCase();
  const isSuperAdmin =
    userRole === "super admin" ||
    userRole === "super_admin" ||
    userRole === "superadmin";
  const {
    labels: workspaceLabels,
    isFetching: isLoadingWorkspaceLabels,
    hasMore,
    loadMore,
    totalCount,
  } = useWorkspaceLabels(workspaceId as string, searchTerm);

  const { topLabels } = useTopWorkspaceLabels(
    workspaceId as string,
    2,
    currentUser?.id
  );

  const { cardLabels, addCardLabel, removeCardLabel } = useLabels(
    workspaceId as string,
    selectedCard?.id,
    { cardId: selectedCard?.id }
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const suggestionsWithAssignment: CardLabel[] = useMemo(() => {
    if (!topLabels) return [];
    // Ensure we keep only top 2, sorted by usageCount desc as a safety net
    const sorted = [...topLabels].sort(
      (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
    );

    return sorted.slice(0, 2).map((label) => ({
      ...label,
      isAssigned:
        cardLabels?.some(
          (cardLabel: CardLabel) => cardLabel.labelId === label.labelId
        ) || false,
    }));
  }, [topLabels, cardLabels]);

  const labelsWithAssignment: CardLabel[] = useMemo(() => {
    if (!workspaceLabels) return [];

    const suggestionIds = new Set(
      suggestionsWithAssignment.map((l) => l.labelId)
    );

    return workspaceLabels
      .filter((label) => !suggestionIds.has(label.labelId))
      .map((label) => ({
        ...label,
        isAssigned:
          cardLabels?.some(
            (cardLabel: CardLabel) => cardLabel.labelId === label.labelId
          ) || false,
      }));
  }, [workspaceLabels, cardLabels, suggestionsWithAssignment]);

  const toggleCheck = (isChecked: boolean, labelId: string) => {
    if (!selectedCard || !workspaceId || !isSuperAdmin) return;

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

      {suggestionsWithAssignment.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mb-1">
            <Sparkles size={14} className="text-amber-500" />
            <span>Suggestions</span>
          </div>
          <div className="space-y-1">
            {suggestionsWithAssignment.map((label) => (
              <div
                key={`suggestion-${label.id || label.labelId}`}
                className={`flex items-center justify-between px-2 py-1 rounded transition ${label.isAssigned
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-100 border border-transparent"
                  }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    checked={!!label.isAssigned}
                    disabled={!isSuperAdmin}
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
                {isSuperAdmin && (
                  <Tooltip title="Edit label">
                    <button
                      onClick={() => handleEdit(label)}
                      className="p-1 hover:bg-gray-200 rounded-sm transition-colors ml-2"
                    >
                      <Pencil size={14} className="text-gray-500" />
                    </button>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
          <div className="h-px bg-gray-200 my-3" />
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {labelsWithAssignment.map((label) => (
          <div
            key={label.id}
            className={`flex items-center justify-between px-2 py-1 rounded transition ${label.isAssigned
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
            {isSuperAdmin && <Tooltip title="Edit label">
              <button
                onClick={() => handleEdit(label)}
                className="p-1 hover:bg-gray-200 rounded-sm transition-colors ml-2"
              >
                <Pencil size={14} className="text-gray-500" />
              </button>
            </Tooltip>}
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

      {isSuperAdmin && <div className="mt-4">
        <Button block size="small" onClick={() => setPopoverPage("add")}>
          Create a new label
        </Button>
      </div>}
    </div>
  );
};

export default Home;

"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useCardDetails } from "@hooks/card-details";
import { usePriorities } from "@hooks/priority";
import PriorityFlag from "./priority-flag";
import { Card } from "@myTypes/card";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

interface PriorityDropdownProps {
  cardId: string;
  listId: string;
  boardId?: string;
  priority?: Card["priorityInfo"] | null;
  className?: string;
}

const PriorityDropdown: React.FC<PriorityDropdownProps> = ({
  cardId,
  listId,
  boardId = "",
  priority,
  className,
}) => {
  const { canManageCardMembers } = useBoardPermissionsContext();
  const canManage = canManageCardMembers();
  const { updateCard } = useCardDetails(cardId, listId, boardId, {
    skipFetch: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const prioritiesQuery = usePriorities(canManage);
  const priorityOptions = prioritiesQuery.data?.data ?? [];
  const priorityMenuItems = useMemo<MenuProps["items"]>(() => {
    const items: MenuProps["items"] = priorityOptions.map((p) => ({
      key: p.id,
      label: (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center" style={{ color: p.color || "#E5E7EB" }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4 2a1 1 0 00-1 1v10.5a.5.5 0 001 0V9h6.5a.5.5 0 00.4-.8L10 6l.9-1.2A.5.5 0 0010.5 4H4V3a1 1 0 00-1-1z" />
            </svg>
          </span>
          <span>{p.name}</span>
        </div>
      ),
    }));

    if (items.length > 0) {
      items.push({ type: "divider" });
    }

    items.push({
      key: "__no_priority__",
      label: "No priority",
    });

    return items;
  }, [priorityOptions]);

  const handlePriorityChange = (nextId: string | null) => {
    if (!canManage || isUpdating) return;
    if (nextId === (priority?.id ?? null)) return;
    setIsUpdating(true);
    updateCard(
      { priorityId: nextId },
      {
        onSettled: () => setIsUpdating(false),
      }
    );
  };

  if (!canManage) {
    return (
      <div className={className}>
        <PriorityFlag priority={priority} />
      </div>
    );
  }

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: priorityMenuItems,
        onClick: ({ key }) =>
          handlePriorityChange(key === "__no_priority__" ? null : key),
      }}
      disabled={prioritiesQuery.isLoading || isUpdating}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1 ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <PriorityFlag priority={priority} />
        <ChevronDown size={12} className="text-gray-500" />
      </button>
    </Dropdown>
  );
};

export default PriorityDropdown;

"use client";
import { Card } from "@myTypes/card";
import React from "react";

interface PriorityFlagProps {
  priority?: Card["priorityInfo"] | null;
}

const PriorityFlag: React.FC<PriorityFlagProps> = ({ priority }) => {
  if (!priority) {
    return <span className="text-[10px] text-gray-400">--</span>;
  }

  const color = priority.color || "#E5E7EB";

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700"
      title={priority.name}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{ color }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M4 2a1 1 0 00-1 1v10.5a.5.5 0 001 0V9h6.5a.5.5 0 00.4-.8L10 6l.9-1.2A.5.5 0 0010.5 4H4V3a1 1 0 00-1-1z" />
        </svg>
      </span>
      <span>{priority.name}</span>
    </span>
  );
};

export default PriorityFlag;

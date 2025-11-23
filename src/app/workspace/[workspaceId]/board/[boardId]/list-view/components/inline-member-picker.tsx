"use client";

import { UserSelection } from "@components/selection";
import { Popover } from "antd";
import { Plus } from "lucide-react";
import React, { useState } from "react";

interface InlineMemberPickerProps {
  excludeIds: string[];
  onSelect: (value: string) => void;
}

const InlineMemberPicker: React.FC<InlineMemberPickerProps> = ({
  excludeIds,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (!value) return;
    onSelect(value);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      trigger="click"
      content={
        <UserSelection
          placeholder="Select user"
          size="small"
          width={220}
          excludeIds={excludeIds}
          onChange={(value: any) => handleSelect(value)}
        />
      }
      overlayClassName="inline-member-picker"
    >
      <div
        className="flex items-center justify-center w-4 h-4 rounded-full border border-dashed border-gray-300 cursor-pointer hover:border-gray-400"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Plus size={12} />
      </div>
    </Popover>
  );
};

export default InlineMemberPicker;

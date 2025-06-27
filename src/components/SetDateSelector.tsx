import React, { useState, Dispatch, SetStateAction } from "react";
import { Button, Popover } from "antd";
import { Calendar, X } from "lucide-react";

export interface PresetOption {
  value: string;
  label: string;
}

export interface SetDateSelectorProps {
  /** currently selected value object (or primitive) */
  value: any;
  /** callback when user picks / clears a value */
  onChange: (val: any | null) => void;
  /** list of preset options */
  options: PresetOption[];
}

/*
 * Stand-alone reusable selector for the pattern:
 *   "set date custom field to <date_value>"
 * It renders:
 *   • A chip when a value is selected (click X to clear)
 *   • Otherwise a small calendar-icon button that opens a popover with presets.
 */
const SetDateSelector: React.FC<SetDateSelectorProps> = ({
  value,
  onChange,
  options,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (opt: PresetOption) => {
    onChange(opt);
    setOpen(false);
  };

  if (value) {
    return (
      <span className="inline-flex items-center bg-gray-500 text-white rounded px-2 py-1 text-sm">
        {value.label || value}
        <X
          size={12}
          className="ml-1 cursor-pointer"
          onClick={() => onChange(null)}
        />
      </span>
    );
  }

  const content = (
    <div className="p-2 flex flex-col gap-2 w-max">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="text"
          size="small"
          onClick={() => handleSelect(opt)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      content={content}
    >
      <Button type="text" size="small" className="mx-2">
        <Calendar size={14} />
      </Button>
    </Popover>
  );
};

export default SetDateSelector;

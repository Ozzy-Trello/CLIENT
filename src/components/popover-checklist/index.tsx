import React, { useState } from "react";
import { Button, Input, Popover, Typography } from "antd";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCreateChecklist } from "@hooks/checklist";
import { X } from "lucide-react";

interface PopoverChecklistProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl: React.ReactNode;
}

const PopoverChecklist: React.FC<PopoverChecklistProps> = ({
  open,
  setOpen,
  triggerEl,
}) => {
  const [checklistTitle, setChecklistTitle] = useState("");
  const { selectedCard } = useCardDetailContext();
  const createChecklistMutation = useCreateChecklist();

  const handleAddChecklist = () => {
    if (!checklistTitle.trim() || !selectedCard?.id) return;

    createChecklistMutation.mutate({
      card_id: selectedCard.id,
      title: checklistTitle,
      data: [],
    });

    // Reset and close
    setChecklistTitle("");
    setOpen(false);
  };

  const content = (
    <div
      className="p-2 relative"
      style={{ width: "300px" }}
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute top-2 right-2 z-10 text-black text-lg font-bold rounded-full bg-white border border-gray-200 shadow-sm p-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Close checklist popover"
      >
        <X size={14} />
      </button>
      <Typography.Title level={5} className="mb-5">
        Add checklist
      </Typography.Title>

      <div className="mb-3">
        <Input
          placeholder="Checklist"
          value={checklistTitle}
          onChange={(e) => setChecklistTitle(e.target.value)}
          onPressEnter={handleAddChecklist}
          autoFocus
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="primary"
          onClick={handleAddChecklist}
          disabled={!checklistTitle.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      arrow={true}
      styles={{ body: { padding: 0 } }}
    >
      {triggerEl}
    </Popover>
  );
};

export default PopoverChecklist;

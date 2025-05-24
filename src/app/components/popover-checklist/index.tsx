import React, { useState } from "react";
import { Button, Input, Popover, Typography } from "antd";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { useCreateChecklist } from "@/app/hooks/checklist";

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
    <div className="p-2" style={{ width: "300px" }}>
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
      overlayInnerStyle={{ padding: 0 }}
    >
      {triggerEl}
    </Popover>
  );
};

export default PopoverChecklist;

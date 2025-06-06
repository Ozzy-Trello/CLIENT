import React, { ReactNode, useState } from "react";
import { Popover, Typography } from "antd";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCardDetailContext } from "@providers/card-detail-context";
import LabelManager from "./label-manager";
import LabelForm from "./label-form";
import { Label } from "@myTypes/label";

interface PopoverLabel {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverLabel: React.FC<PopoverLabel> = ({ 
  open, 
  setOpen, 
  triggerEl 
}) => {

  const { selectedCard, activeList, setSelectedCard } = useCardDetailContext();
  const {boardId} = useParams();
  const [popoverPage, setPopoverPage] = useState<'home' | 'form'>('home');
  const [selectedLabel, setSelectedLabel] = useState<Label | undefined>(undefined);
  

  const onCancel = () => {
    setOpen(false);
  }
 
  return (
    <Popover
      content={
        popoverPage === 'home' ? (
          <LabelManager 
            popoverPage={popoverPage}
            setPopoverPage={setPopoverPage}
            selectedLabel={selectedLabel}
            setSelectedLabel={setSelectedLabel}
          />
        ) : (
          <LabelForm 
            popoverPage={popoverPage}
            setPopoverPage={setPopoverPage}
             selectedLabel={selectedLabel}
            setSelectedLabel={setSelectedLabel}
          />
        )
      }
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <Typography.Title level={5} className="m-0">Label</Typography.Title>
          </div>
          <button 
            onClick={() => {
              setOpen(false);
              setSelectedLabel(undefined);
              setPopoverPage('home');
            }}
            className="hover:bg-gray-100 p-1 rounded-sm transition-colors"
          >
            <X size={14} className="text-gray-400"/>
          </button>
        </div>
      }
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      overlayClassName="custom-field-popover"
      destroyTooltipOnHide
    >
      {triggerEl}
    </Popover>
  );
};

export default PopoverLabel;
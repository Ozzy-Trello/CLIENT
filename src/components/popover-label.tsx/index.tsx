import React, { ReactNode, useState } from "react";
import { Button, Popover, Typography } from "antd";
import { ChevronLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCardDetailContext } from "@providers/card-detail-context";
import Home from "./home";
import LabelForm from "./label-form";
import { CardLabel, Label } from "@myTypes/label";

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
  const [popoverPage, setPopoverPage] = useState<'home' | 'add' | 'update'>('home');
  const [selectedLabel, setSelectedLabel] = useState<CardLabel | undefined>(undefined);
  

  const onCancel = () => {
    setOpen(false);
  }
  
  const goBack = () => {
    setPopoverPage('home');
    setSelectedLabel(undefined);
  }

  return (
    <Popover
      content={
        popoverPage === 'home' ? (
          <Home 
            popoverPage={popoverPage}
            setPopoverPage={setPopoverPage}
            selectedLabel={selectedLabel}
            setSelectedLabel={setSelectedLabel}
            selectedCard={selectedCard}
          />
        ) : (
          <LabelForm 
            popoverPage={popoverPage}
            setPopoverPage={setPopoverPage}
            selectedLabel={selectedLabel}
            setSelectedLabel={setSelectedLabel}
            selectedCard={selectedCard}
          />
        )
      }
      title={
       <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2 text-[12px]">
            {popoverPage !== "home" && (
              <Button size="small" type="text">
                <ChevronLeft size={16} onClick={goBack} />
              </Button>
            )}
            <span>
              {
                popoverPage === "home" ? "Label" :
                popoverPage === "add" ? "Add new Label" :
                popoverPage === "update" ? "Update Label" :
                ""
              }
            </span>
          </div>
          <Button 
            size="small"
            type="text"
            onClick={() => setOpen(false)}
          >
            <X size={14} className="text-gray-400"/>
          </Button>
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
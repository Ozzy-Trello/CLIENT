import React, { ReactNode, useEffect, useState } from "react";
import { Popover, Typography } from "antd";
import { ChevronLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import { UserSelection } from "../selection";
import ContentMoveCard from "./content";

interface PopoverMoveCardProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverMoveCard: React.FC<PopoverMoveCardProps> = ({ 
  open, 
  setOpen, 
  triggerEl 
}) => {
  const { workspaceId } = useParams();
 
  return (
    <Popover
      content={<ContentMoveCard />}
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <Typography.Title level={5} className="m-0">Move Card</Typography.Title>
          </div>
          <button 
            onClick={() => setOpen(false)}
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

export default PopoverMoveCard;
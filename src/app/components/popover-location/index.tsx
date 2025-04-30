import React, { ReactNode, useEffect, useState } from "react";
import { Popover, Typography } from "antd";
import { ChevronLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCustomFields } from "@/app/hooks/custom_field";
import { CustomField } from "@/app/dto/types";
import { UserSelection } from "../selection";
import LocationAutocomplete from "./content";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { useCards } from "@/app/hooks/card";

interface PopoverLocationProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverLocation: React.FC<PopoverLocationProps> = ({ 
  open, 
  setOpen, 
  triggerEl 
}) => {

  const { selectedCard, activeList, setSelectedCard } = useCardDetailContext();
  const {updateCard} = useCards(activeList?.id || '');

  const onLocationSelect = (location: any) => {
    if (location?.lat && location?.lon && selectedCard?.id) {
      const coordinate = `${location.lat}|${location.lon}`;
      updateCard({
        cardId: selectedCard.id,
        updates: { 
          location: coordinate
        },
        listId: activeList?.id || '',
        destinationListId: activeList?.id || ''
      }, {
        onSuccess: (data) => {
          console.log("Location update successful:", data);
          if (setSelectedCard) {
            setSelectedCard({
              ...selectedCard,
              location: coordinate
            });
          }
        },
      });
      onCancel();
    }
  }

  const onCancel = () => {
    setOpen(false);
  }
 
  return (
    <Popover
      content={<LocationAutocomplete onLocationSelect={onLocationSelect} onCancel={onCancel} />}
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <Typography.Title level={5} className="m-0">Location</Typography.Title>
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

export default PopoverLocation;
import React, { ReactNode, useEffect, useState } from "react";
import { Popover, Typography } from "antd";
import { ChevronLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import { UserSelection } from "../selection";
import DateSetter from "./content";
import { useCardDetails, useCards } from "@hooks/card";
import { useCardDetailContext } from "@providers/card-detail-context";

interface PopoverCustomFieldProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverDates: React.FC<PopoverCustomFieldProps> = ({ 
  open, 
  setOpen, 
  triggerEl 
}) => {
  const { workspaceId, boardId } = useParams();
  const {selectedCard, setSelectedCard, activeList} =  useCardDetailContext();
  const { updateCard, isUpdating } = useCardDetails(selectedCard?.id || "", activeList?.id || "", (boardId as string) || "");
  const [ dates, setDates ] = useState<{startDate: Date | null, dueDate: Date | null, dueDateReminder:string | null}>();

  const onSave = async(startDate: Date | null, dueDate: Date | null, reminder: string | null) => {
    setDates({
      startDate: startDate,
      dueDate: dueDate,
      dueDateReminder: reminder
    });
    updateCard({startDate: startDate || undefined, dueDate: dueDate || undefined, dueDateReminder: reminder || ""})
  }

  useEffect(() => {
    setDates({
      startDate: selectedCard?.startDate || new Date(),
      dueDate: selectedCard?.dueDate || null,
      dueDateReminder: selectedCard?.dueDateReminder || ""
    });
  }, []);

  useEffect(() => {
    if (!isUpdating && selectedCard && dates) {
      setSelectedCard(prevCard => {
        if (!prevCard) return prevCard;
        return {
          ...prevCard,
          startDate: dates.startDate || undefined,
          dueDate: dates.dueDate || undefined,
          dueDateReminder: dates.dueDateReminder || ""
        };
      });
    }
  }, [isUpdating, dates])
 
  return (
    <Popover
      content={
        <div style={{ maxHeight: 'calc(90vh - 60px)', overflowY: 'auto', paddingRight: "10px" }}>
          <DateSetter
            onSave={onSave}
            initialStartDate={dates?.startDate || null}
            initialDueDate={dates?.dueDate || null}
            initialReminder={dates?.dueDateReminder || null}
          />
        </div>
      }
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <Typography.Title level={5} className="m-0">Dates</Typography.Title>
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

export default PopoverDates;
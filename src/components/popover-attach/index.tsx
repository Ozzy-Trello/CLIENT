import React, { ReactNode } from "react";
import { Popover, Typography, message } from "antd";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { FileUpload } from "@myTypes/file-upload"; // Use your existing FileUpload type
import { Content } from "antd/es/layout/layout";
import ContentAttach from "./content";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCards } from "@hooks/card";
import { useCardAttachment } from "@hooks/card_attachment";
import { EnumAttachmentType } from "@myTypes/card";

interface PopoverAttachProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverAttach: React.FC<PopoverAttachProps> = ({
  open,
  setOpen,
  triggerEl,
}) => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { selectedCard, activeList, setSelectedCard } = useCardDetailContext();
  const { addAttachment } = useCardAttachment(selectedCard?.id || "");
  
  
  const handleAttachFile = (file: File, result: FileUpload) => {
    setOpen(false);
  };
  
  const handleAttachCard = (linkedCardId: string) => {
    if (selectedCard) {
      addAttachment({
        cardId: selectedCard.id,
        attachableType: EnumAttachmentType.Card,
        attachableId: linkedCardId,
        isCover: false
      });
    }
    setOpen(false);
  };
 
  return (
    <Popover
      content={
        <ContentAttach
          onAttachFile={handleAttachFile}
          onAttachCard={handleAttachCard}
          onClose={() => setOpen(false)}
          card={selectedCard}
          workspaceId={workspaceId}
        />
      }
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <Typography.Title level={5} className="m-0">Attach</Typography.Title>
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

export default PopoverAttach;
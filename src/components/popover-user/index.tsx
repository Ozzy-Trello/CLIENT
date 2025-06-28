import React, { ReactNode } from "react";
import { Popover, Typography } from "antd";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { UserSelection } from "../selection";

interface PopoverCustomFieldProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
  onUserSelectionChange?: (value: string, option?: any) => void;
  excludeIds?: string[];
}

const PopoverUser: React.FC<PopoverCustomFieldProps> = ({
  open,
  setOpen,
  triggerEl,
  onUserSelectionChange,
  excludeIds = [],
}) => {
  const { workspaceId } = useParams();

  return (
    <Popover
      content={
        open ? (
          <UserSelection
            onChange={onUserSelectionChange}
            excludeIds={excludeIds}
          />
        ) : null
      }
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            <Typography.Title level={5} className="m-0">
              Members
            </Typography.Title>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="hover:bg-gray-100 p-1 rounded-sm transition-colors"
          >
            <X size={14} className="text-gray-400" />
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

export default PopoverUser;

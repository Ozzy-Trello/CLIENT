import React, { ReactNode, useEffect, useState } from "react";
import { Popover, Typography } from "antd";
import HomeCustomField from "./home-custom-field";
import { ChevronLeft, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCustomFields } from "@/app/hooks/custom_field";
import AddUpdateField from "./add-update-field";
import { CustomField } from "@/app/dto/types";

interface PopoverCustomFieldProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerEl?: ReactNode;
}

const PopoverCustomField: React.FC<PopoverCustomFieldProps> = ({ 
  open, 
  setOpen, 
  triggerEl 
}) => {
  const { workspaceId } = useParams();
  const currentWorkspaceId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
  
  const [popoverPage, setPopoverPage] = useState<'home' | 'add' | 'update'>('home');
  const [selectedCustomField, setSelectedCustomField] = useState<CustomField | undefined>();
  
  const { 
    customFields, 
    isLoading, 
    addCustomField, 
    updateCustomField 
  } = useCustomFields(currentWorkspaceId);
  
  // Reset selected field when popover closes
  useEffect(() => {
    if (!open) {
      setPopoverPage('home');
      setSelectedCustomField(undefined);
    }
  }, [open]);
  
  const goBack = () => {
    setPopoverPage("home");
    setSelectedCustomField(undefined);
  };
 
  return (
    <Popover
      content={
        popoverPage === 'home' ? (
          <HomeCustomField
            popoverPage={popoverPage}
            setPopoverPage={setPopoverPage}
            selectedCustomField={selectedCustomField}
            setSelectedCustomField={setSelectedCustomField}
            customFields={customFields}
            isLoading={isLoading}
          />
        ) : (popoverPage === 'add' || popoverPage === 'update') ? (
          <AddUpdateField
            popoverPage={popoverPage}
            setPopoverPage={setPopoverPage}
            selectedCustomField={selectedCustomField}
            setSelectedCustomField={setSelectedCustomField}
            addCustomField={addCustomField}
            updateCustomField={updateCustomField}
          />
        ) : null
      }
      title={
        <div className="flex justify-between items-center">
          <div className="flex justify-start items-center gap-2">
            {popoverPage !== "home" && (
              <button className="cursor-pointer">
                <ChevronLeft size={16} onClick={goBack} />
              </button>
            )}
            <Typography.Title level={5} className="m-0">
              {
                popoverPage === "home" ? "Custom Fields" :
                popoverPage === "add" ? "Add new custom field" :
                popoverPage === "update" ? "Update custom field" : null
              }
            </Typography.Title>
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

export default PopoverCustomField;
import React, { ReactNode, useEffect, useState } from "react";
import { Button, Popover, Typography } from "antd";
import HomeCustomField from "./home-custom-field";
import { ChevronLeft, X, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useCustomFields } from "@hooks/custom_field";
import AddUpdateField from "./add-update-field";
import { CustomField } from "@myTypes/custom-field";
import { useCardDetailContext } from "@providers/card-detail-context";

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
  
  const [popoverPage, setPopoverPage] = useState<'home' | 'add' | 'update' | 'trigger' | 'custom-option'>('home');
  const [selectedCustomField, setSelectedCustomField] = useState<CustomField | undefined>();
  const {selectedCard} = useCardDetailContext();
  
  const { 
    customFields, 
    isLoading, 
    createCustomField, 
    updateCustomField,
    reorderCustomFields,
    invalidateSpecificCardCustomFields,
    isCreating,
    isUpdating,
    isDeleting,
    isReordering,
  } = useCustomFields(currentWorkspaceId);
  
  // Reset selected field when popover closes
  useEffect(() => {
    if (!open) {
      setPopoverPage('home');
      setSelectedCustomField(undefined);
    }
  }, [open]);

  useEffect(() => {
    if (!isCreating && !isUpdating && !isDeleting && !isReordering) {
      invalidateSpecificCardCustomFields(selectedCard?.id)
    }
  }, [isCreating, isUpdating, isDeleting, isReordering]);
  
  const goBack = () => {
    setPopoverPage("home");
    setSelectedCustomField(undefined);
  };
 
  return (
    <Popover
      content={
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {popoverPage === 'home' ? (
              <HomeCustomField
                popoverPage={popoverPage}
                setPopoverPage={setPopoverPage}
                selectedCustomField={selectedCustomField}
                setSelectedCustomField={setSelectedCustomField}
                customFields={customFields}
                isLoading={isLoading}
                reorderCustomFields={reorderCustomFields}
              />
            ) : (popoverPage === 'add' || popoverPage === 'update') ? (
              <AddUpdateField
                popoverPage={popoverPage}
                setPopoverPage={setPopoverPage}
                selectedCustomField={selectedCustomField}
                setSelectedCustomField={setSelectedCustomField}
                selectedCard={selectedCard}
                createCustomField={createCustomField}
                updateCustomField={({ customFieldId, updates }) => updateCustomField({ id: customFieldId, updates })}
              />
            ) : (popoverPage == 'custom-option') ? (
              null
            ) :  (
              null
            )}
          </div>
          {popoverPage === 'home' && (
            <div className="pt-2 border-t mt-2">
              <Button
                className="w-full"
                size="small"
                icon={<Plus size={14} />}
                onClick={() => setPopoverPage("add")}
              >
                New field
              </Button>
            </div>
          )}
        </div>
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
                popoverPage === "home" ? "Custom Fields" :
                popoverPage === "add" ? "Add new custom field" :
                popoverPage === "update" ? "Update custom field" :
                popoverPage === "custom-option" ? "Custom option" :
                popoverPage === "trigger" ? "Trigger" :
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
      overlayStyle={{ maxHeight: '500px' }}
      destroyTooltipOnHide
    >
      {triggerEl}
    </Popover>
  );
};

export default PopoverCustomField;
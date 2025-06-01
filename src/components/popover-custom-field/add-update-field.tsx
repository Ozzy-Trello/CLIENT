import { useLists } from "@hooks/list";
import { generateId } from "@utils/general";
import { Button, Input, Select, Typography, message } from "antd";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ListSelection, SelectionRef } from "../selection";
import { ChevronRight, Plus } from "lucide-react";
import { useCardDetailContext } from "@providers/card-detail-context";
import { CustomField } from "@myTypes/type";

interface AddUpdateFieldProps {
  popoverPage: string;
  setPopoverPage: any;
  selectedCustomField: CustomField | undefined;
  setSelectedCustomField: any;
  addCustomField: (newField: Partial<CustomField>) => void;
  updateCustomField: ({ customFieldId, workspaceId, updates }: { 
    customFieldId: string, 
    workspaceId: string; 
    updates: Partial<CustomField> 
  }) => void;
}

const AddUpdateField: React.FC<AddUpdateFieldProps> = (props) => {
  const { 
    popoverPage, 
    setPopoverPage, 
    selectedCustomField, 
    setSelectedCustomField, 
    addCustomField,
    updateCustomField: updateCustomFieldMutation
  } = props;
  
  const { workspaceId } = useParams();
  const currentWorkspaceId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
  const {selectedCard} = useCardDetailContext();
  
  const [newField, setNewField] = useState<CustomField>({
    id: generateId(),
    boardId: currentWorkspaceId || "",
    name: "",
    description: "",
    source: "user",
    trigger: {}
  });


  const listSelectionRef = useRef<SelectionRef>(null);


  // Reset the form when popoverPage changes
  useEffect(() => {
    if (popoverPage === "add") {
      setNewField({
        id: generateId(),
        boardId: currentWorkspaceId || "",
        name: "",
        description: "",
        source: "user",
        trigger: {}
      });
    }
  }, [popoverPage, currentWorkspaceId]);
  
  const isAddMode = popoverPage === "add";
  
  const change = (key: string, value: string) => {
    if (isAddMode) {
      setNewField((prev: CustomField) => ({
        ...prev,
        [key]: value
      }));
    } else {
      setSelectedCustomField((prev: CustomField) => ({
        ...prev,
        [key]: value
      }));
    }
  };
  
  const changeTrigger = (key: string, value: string) => {
    if (isAddMode) {
      setNewField((prev: CustomField) => ({
        ...prev,
        trigger: {
          ...prev.trigger,
          [key]: value
        }
      }));
    } else {
      setSelectedCustomField((prev: CustomField) => ({
        ...prev,
        trigger: {
          ...prev.trigger,
          [key]: value
        }
      }));
    }
  };
  
  // const changeTriggerAction = (key: string, value: string) => {
  //   if (isAddMode) {
  //     setNewField((prev: CustomField) => ({
  //       ...prev,
  //       trigger: {
  //         ...prev.trigger,
  //         action: {
  //           ...prev.trigger.action,
  //           [key]: value
  //         }
  //       }
  //     }));
  //   } else {
  //     setSelectedCustomField((prev: CustomField) => ({
  //       ...prev,
  //       trigger: {
  //         ...prev.trigger,
  //         action: {
  //           ...prev.trigger.action,
  //           [key]: value
  //         }
  //       }
  //     }));
  //   }
  // };
  
  const cancel = () => {
    setNewField({ 
      id: generateId(), 
      boardId: currentWorkspaceId || "",
      name: "", 
      description: "", 
      source: "user",
      trigger: {}
    });
    setPopoverPage("home");
  }
  
  const handleSave = async() => {
    // Validation
    if (isAddMode && !newField.name) {
      message.error("Field name is required");
      return;
    }
    
    if (!isAddMode && !selectedCustomField?.name) {
      message.error("Field name is required");
      return;
    }
    
    if (isAddMode) {
      if (selectedCard) {
        const fieldWithWorkspace = {
          ...newField,
          workspaceId: currentWorkspaceId,
        };
        
        addCustomField(fieldWithWorkspace);
        // Reset form
        setNewField({
          id: generateId(),
          boardId: currentWorkspaceId || "",
          name: "",
          description: "",
          source: "user",
          trigger: {}
        });
      }
      // Add workspaceId to the new field
  
    } else if (!isAddMode && selectedCustomField) {
      // Update existing field
      updateCustomFieldMutation({
        customFieldId: selectedCustomField.id,
        workspaceId: currentWorkspaceId || "",
        updates: selectedCustomField
      });
    }
    
    // Return to home screen
    setPopoverPage("home");
  };
  
  const currentField = isAddMode ? newField : selectedCustomField;
  useEffect(() => {
    if (listSelectionRef.current && selectedCustomField?.trigger?.action?.targetListId) {
      listSelectionRef.current.setValue(selectedCustomField.trigger.action.targetListId);
    }
  }, [selectedCustomField, listSelectionRef.current]);

  return (
    <div className="h-fit">
      <div className="max-h-60 overflow-y-auto px-2">
        {/* Title Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="field-name" className="block mb-1.5 font-medium text-gray-600">
            Title
          </label>
          <Input
            id="field-name"
            name="name"
            className="w-full"
            value={isAddMode ? newField.name : selectedCustomField?.name || ""}
            onChange={(e) => change("name", e.target.value)}
          />
        </div>
        
        {/* Description Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="field-description" className="block mb-1.5 font-medium text-gray-600">
            Description
          </label>
          <Input
            id="field-description"
            name="description"
            className="w-full"
            value={isAddMode ? newField.description : selectedCustomField?.description || ""}
            onChange={(e) => change("description", e.target.value)}
          />
        </div>
        
        {/* Type Field */}
        {/* <div className="mb-3 text-xs">
          <label htmlFor="field-type" className="block mb-1.5 font-medium text-gray-600">
            Type
          </label>
          <Select
            id="field-type"
            className="w-full"
            value={isAddMode ? newField.type : selectedCustomField?.type}
            onChange={(value) => change("type", value)}
            options={[
              {value: "text", label: "Text"},
              {value: "number", label: "Number"},
              {value: "date", label: "Date"},
              {value: "dropdown", label: "Dropdown"},
              {value: "checkbox", label: "Checkbox"},
            ]}
          />
        </div> */}
        
        {/* Conditional Source Field */}
        { selectedCustomField?.type === "dropdown" && (
          <>
            <div className="mb-3 text-xs">
              <label htmlFor="field-source" className="block mb-1.5 font-medium text-gray-600">
                Source
              </label>
              <Select
                id="field-source"
                className="w-full"
                value={isAddMode ? newField.source : selectedCustomField?.source}
                onChange={(value) => {
                  if (typeof value === "string") {
                    change("source", value);
                  } else {
                    change("source", JSON.stringify(value));
                  }
                }}
                options={[
                  {value: "user", label: "User"},
                  {value: "custom", label: "Custom"},
                ]}
              />
            </div>
            
            { selectedCustomField.source === "custom" && (
              <Button 
                size="small" 
                className="w-full mb-2" 
                icon={<ChevronRight size={14} />} 
                iconPosition="end"
                onClick={() => {setPopoverPage('custom-option')}}
              >
                Add option
              </Button>
            )}
          </>
        )}

        {/* { popoverPage === "update" && (
          <Button 
            size="small" 
            className="w-full mb-2" 
            icon={<ChevronRight size={14} />}
            iconPosition="end"
            onClick={() => {setPopoverPage('trigger')}}
          >
            Set Trigger
          </Button>
        ) } */}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end items-center mt-4 pt-3 border-t border-gray-100">
        <Button 
          size="small" 
          onClick={cancel}
        >
          Cancel
        </Button>
        <Button 
          type="primary" 
          size="small" 
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default AddUpdateField;
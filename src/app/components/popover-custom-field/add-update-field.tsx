import { CustomField } from "@/app/dto/types";
import { generateId } from "@/app/utils/general";
import { Button, Input, Select, message } from "antd";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

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
  
  const [newField, setNewField] = useState<CustomField>({
    id: generateId(),
    name: "",
    description: "",
    source: "user"
  });
  
  // Reset the form when popoverPage changes
  useEffect(() => {
    if (popoverPage === "add") {
      setNewField({
        id: generateId(),
        name: "",
        description: "",
        source: "user"
      });
    }
  }, [popoverPage]);
  
  const change = (key: string, value: string) => {
    if (popoverPage === "add") {
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
  
  const cancel = () => {
    setNewField({ 
      id: generateId(), 
      name: "", 
      description: "", 
      source: "user"
    });
    setPopoverPage("home");
  }
  
  const handleSave = () => {
    // Validation
    if (popoverPage === "add" && !newField.name) {
      message.error("Field name is required");
      return;
    }
    
    if (popoverPage === "update" && !selectedCustomField?.name) {
      message.error("Field name is required");
      return;
    }
    
    if (popoverPage === "add") {
      // Add workspaceId to the new field
      const fieldWithWorkspace = {
        ...newField,
        workspaceId: currentWorkspaceId
      };
      
      addCustomField(fieldWithWorkspace);
      // Reset form
      setNewField({
        id: generateId(),
        name: "",
        description: "",
        source: "user"
      });
    } else if (popoverPage === "update" && selectedCustomField) {
      // Update existing field
      updateCustomFieldMutation({
        customFieldId: selectedCustomField.id,
        workspaceId: currentWorkspaceId,
        updates: selectedCustomField
      });
    }
    
    // Return to home screen
    setPopoverPage("home");
  };
  
  return (
    <div className="min-h-5 overflow-y-scroll">
      <div className="mb-2">
        <label htmlFor="field-name">Title</label>
        <Input
          id="field-name"
          name="name"
          value={popoverPage === "add" ? newField.name : selectedCustomField?.name}
          onChange={(e) => change("name", e.target.value)}
        />
      </div>
      <div className="mb-2">
        <label htmlFor="field-description">Description</label>
        <Input
          id="field-description"
          name="description"
          value={popoverPage === "add" ? newField.description : selectedCustomField?.description}
          onChange={(e) => change("description", e.target.value)}
        />
      </div>
      <div className="mb-2 flex flex-col">
        <label htmlFor="field-source">Source</label>
        <Select
          id="field-source"
          className="w-full"
          value={popoverPage === "add" ? newField.source : selectedCustomField?.source}
          defaultValue="user"                                                                                           
          onChange={(value) => change("source", value)}
          options={[
            {value: "user", label: "User"},
            {value: "custom", label: "Custom"},
          ]}
        />
      </div>
      <div className="flex gap-2 justify-end items-center my-4">
        <Button size="small" onClick={cancel}>Cancel</Button>
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
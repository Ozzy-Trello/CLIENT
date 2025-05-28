import { generateId } from "@utils/general";
import { Button, Checkbox, Form, Input, Select, Typography, message } from "antd";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { SelectionRef } from "../selection";
import { useCardDetailContext } from "@providers/card-detail-context";
import { CustomField, CustomOption, EnumCustomFieldSource, EnumCustomFieldType } from "@myTypes/custom-field";
import { Trash } from "lucide-react";

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
  const [optionForm] = Form.useForm();
  
  const [newField, setNewField] = useState<CustomField>({
    id: generateId(),
    workspaceId: currentWorkspaceId || "",
    name: "",
    description: "",
    source: "",
    type: EnumCustomFieldType.Text,
    isShowAtFront: false
  });

  const listSelectionRef = useRef<SelectionRef>(null);


  // Reset the form when popoverPage changes
  useEffect(() => {
    if (popoverPage === "update" && selectedCustomField) {
      setNewField(selectedCustomField);
    }
  }, [newField, popoverPage, currentWorkspaceId]);
  
  const isAddMode = popoverPage === "add";
  
  const change = (key: string, value: string) => {
    setNewField((prev: CustomField) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddOption = async() => {
    const values = await optionForm.validateFields();
    if (values?.option) {
      let sanitized = values?.option?.trim();
      let option: CustomOption = {
        label: sanitized,
        value: sanitized.replaceAll(" ", "-")
      }
      let options: CustomOption[] = [];
      if (newField?.options) {
        options = [...newField?.options]
      }
      options.push(option);
      setNewField((prev: CustomField) => ({
        ...prev,
        options: options
      }));
      optionForm.resetFields();
    }
  }
  
  const deleteOption = (valueToDelete: string) => {
    let options: CustomOption[] = [];
    if (newField?.options) {
      options = [...newField?.options]
    }
    options = options.filter((item) => (item.value != valueToDelete));
    setNewField((prev: CustomField) => ({
      ...prev,
      options: options
    }));
  }

  const cancel = () => {
    setNewField({ 
      id: generateId(), 
      workspaceId: currentWorkspaceId || "",
      name: "", 
      description: "", 
      source: "",
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
          source: "",
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

  return (
    <div className="h-fit">
      <div className="max-h-60 overflow-y-auto px-2">
        {/* Title Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="field-name" className="block mb-1.5 font-medium text-gray-600">
            Title
          </label>
          <Input
            size="small"
            id="field-name"
            name="name"
            className="w-full"
            value={newField?.name || ""}
            onChange={(e) => change("name", e.target.value)}
          />
        </div>
        
        {/* Description Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="field-description" className="block mb-1.5 font-medium text-gray-600">
            Description
          </label>
          <Input
            size="small"
            id="field-description"
            name="description"
            className="w-full"
            value={newField?.description || ""}
            onChange={(e) => change("description", e.target.value)}
          />
        </div>
        
        {/* Type Field */}
        <div className="mb-3 text-xs">
          <label htmlFor="field-type" className="block mb-1.5 font-medium text-gray-600">
            Type
          </label>
          <Select
            size="small"
            id="field-type"
            className="w-full"
            value={newField?.type}
            onChange={(value) => change("type", value)}
            options={[
              {value: EnumCustomFieldType.Text, label: EnumCustomFieldType.Text.toWellFormed()},
              {value: EnumCustomFieldType.Number, label: EnumCustomFieldType.Number.toWellFormed()},
              {value: EnumCustomFieldType.Dropdown, label: EnumCustomFieldType.Dropdown.toWellFormed()},
              {value: EnumCustomFieldType.Date, label: EnumCustomFieldType.Date.toWellFormed()},
              {value: EnumCustomFieldType.Checkbox, label: EnumCustomFieldType.Checkbox.toWellFormed()},
            ]}
          />
        </div>
        
        {/* Conditional Source Field */}
        { newField?.type === EnumCustomFieldType.Dropdown && (
          <>
            {/* Source Type */}
            <div className="mb-3 text-xs">
              <label htmlFor="field-source" className="block mb-1.5 font-medium text-gray-600">
                Source
              </label>
              <Select
                size="small"
                id="field-source"
                className="w-full"
                value={newField?.source}
                onChange={(value) => {
                  if (typeof value === "string") {
                    change("source", value);
                  } else {
                    change("source", JSON.stringify(value));
                  }
                }}
                options={[
                  {value: EnumCustomFieldSource.Custom, label: EnumCustomFieldSource.Custom.toWellFormed()},
                  {value: EnumCustomFieldSource.User, label: EnumCustomFieldSource.User.toWellFormed()},
                ]}
              />
            </div>
            
            {/* Added Options */}
            { newField?.options && (
              <>
                <label htmlFor="field-source" className="block mb-1.5 font-medium text-gray-600">
                  Options
                </label>
                <div className="w-full">
                  { newField.options.map((item: CustomOption) => (
                    <div className="flex gap-2 mb-1 bg-gray-100 rounded px-2">
                      <span className="w-full">{item.label}</span>
                      <Button size="small" type="text"><Trash size={12} onClick={() => deleteOption(item.value)} /></Button>
                    </div>
                  ))}
                </div>
              </>
            ) }

            {/* Form add option */}
            { newField?.source === EnumCustomFieldSource.Custom && (
              <Form
                form={optionForm}
                name="add-option-form"
                className="flex items-center gap-2"
              >
                <Form.Item
                  name="option"
                  rules={[{ required: true, message: "Please enter option item" }]}
                >
                  <Input
                    id="field-option"
                    className="w-full"
                    size="small"
                    placeholder="option name"
                  />
                </Form.Item>
                <Form.Item>
                  <Button variant="text" type="text" onClick={handleAddOption}>Add</Button>
                </Form.Item>
              </Form>
            )}
          </>
        )}

        {/* Show at the front card */}
        <div className="text-[11px] flex gap-2 px-2">
          <Checkbox value={selectedCustomField?.isShowAtFront}/>
          <span>Show at the front card</span>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="flex gap-2 justify-end items-center mt-4 pt-3 border-t border-gray-100">
        <Button variant="text" type="text" size="small" color="danger">Delete</Button>
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
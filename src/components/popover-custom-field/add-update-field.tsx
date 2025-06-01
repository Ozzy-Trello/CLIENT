import { generateId } from "@utils/general";
import { Button, Checkbox, Form, Input, Select, Typography, message } from "antd";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { SelectionRef } from "../selection";
import { useCardDetailContext } from "@providers/card-detail-context";
import { CustomField, CustomOption, EnumCustomFieldSource, EnumCustomFieldType } from "@myTypes/custom-field";
import { Trash } from "lucide-react";
import { Card } from "@myTypes/card";

interface AddUpdateFieldProps {
  popoverPage: string;
  setPopoverPage: any;
  selectedCustomField: CustomField | undefined;
  setSelectedCustomField: any;
  selectedCard: Card | null;
  createCustomField: (newField: Partial<CustomField>) => void;
  updateCustomField: ({ customFieldId, updates }: { 
    customFieldId: string, 
    updates: Partial<CustomField> 
  }) => void;
}

const AddUpdateField: React.FC<AddUpdateFieldProps> = (props) => {
  const { 
    popoverPage, 
    setPopoverPage, 
    selectedCustomField, 
    setSelectedCustomField,
    selectedCard,
    createCustomField,
    updateCustomField,
  } = props;
  
  const { workspaceId } = useParams();
  const currentWorkspaceId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
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

  // Reset the form when popoverPage changes
  useEffect(() => {
    if (popoverPage === "update" && selectedCustomField) {
      setNewField(selectedCustomField);
    } else if (popoverPage === "add") {
      // Reset to default when adding new field
      setNewField({
        id: generateId(),
        workspaceId: currentWorkspaceId || "",
        name: "",
        description: "",
        source: "",
        type: EnumCustomFieldType.Text,
        isShowAtFront: false
      });
    }
  }, [popoverPage, selectedCustomField, currentWorkspaceId]); // Fixed dependencies
  
  const isAddMode = popoverPage === "add";
  
  const change = (key: string, value: any) => {    
    if (isAddMode) {
      // In add mode, update newField
      setNewField((prev: CustomField) => {
        const updated = { ...prev, [key]: value };
        return updated;
      });
    } else {
      // In update mode, update selectedCustomField
      setSelectedCustomField((prev: CustomField | undefined) => {
        if (!prev) return prev;
        const updated = { ...prev, [key]: value };
        return updated;
      });
    }
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
      if (currentField?.options) {
        options = [...currentField?.options]
      }
      options.push(option);
      change("options", options);
      optionForm.resetFields();
    }
  }
  
  const deleteOption = (valueToDelete: string) => {
    let options: CustomOption[] = [];
    if (currentField?.options) {
      options = [...currentField?.options]
    }
    options = options.filter((item) => (item.value != valueToDelete));
    change("options", options);
  }
  
  const handleSave = async() => {
    const fieldToSave = isAddMode ? newField : selectedCustomField;
    
    // Validation
    if (!fieldToSave?.name) {
      message.error("Field name is required");
      return;
    }
    
    if (isAddMode) {
      if (selectedCard) {
        const fieldWithWorkspace = {
          ...newField,
          workspaceId: currentWorkspaceId,
        };
        
        createCustomField(fieldWithWorkspace);
        // Reset form
        setNewField({
          id: generateId(),
          workspaceId: currentWorkspaceId || "",
          name: "",
          description: "",
          source: "",
          type: EnumCustomFieldType.Text,
          isShowAtFront: false
        });
      }  
    } else if (!isAddMode && selectedCustomField) {
      // Update existing field
      updateCustomField({
        customFieldId: selectedCustomField.id,
        updates: selectedCustomField
      });
    }
    
    // Return to home screen
    setPopoverPage("home");
  };
  
  // Use the appropriate field based on mode
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
            value={currentField?.name || ""}
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
            value={currentField?.description || ""}
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
            value={currentField?.type}
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
        { currentField?.type === EnumCustomFieldType.Dropdown && (
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
                value={currentField?.source}
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
            { currentField?.options && (
              <>
                <label htmlFor="field-source" className="block mb-1.5 font-medium text-gray-600">
                  Options
                </label>
                <div className="w-full">
                  { currentField.options.map((item: CustomOption) => (
                    <div key={item.value} className="flex gap-2 mb-1 bg-gray-100 rounded px-2">
                      <span className="w-full">{item.label}</span>
                      <Button size="small" type="text"><Trash size={12} onClick={() => deleteOption(item.value)} /></Button>
                    </div>
                  ))}
                </div>
              </>
            ) }

            {/* Form add option */}
            { currentField?.source === EnumCustomFieldSource.Custom && (
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
          <Checkbox 
            checked={Boolean(currentField?.isShowAtFront)}  
            onChange={(e) => {
              change("isShowAtFront", e.target.checked);
            }}
          />
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
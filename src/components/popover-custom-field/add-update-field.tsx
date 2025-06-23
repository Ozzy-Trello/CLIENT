import { getRoles } from "@api/role";
import { Card } from "@myTypes/card";
import {
  CustomField,
  CustomOption,
  EnumCustomFieldSource,
  EnumCustomFieldType,
} from "@myTypes/custom-field";
import { Role } from "@myTypes/role";
import { generateId } from "@utils/general";
import { Button, Checkbox, Form, Input, message, Select, Spin } from "antd";
import { Trash } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface AddUpdateFieldProps {
  popoverPage: string;
  setPopoverPage: any;
  selectedCustomField: CustomField | undefined;
  setSelectedCustomField: any;
  selectedCard: Card | null;
  createCustomField: (newField: Partial<CustomField>) => void;
  updateCustomField: ({
    customFieldId,
    updates,
  }: {
    customFieldId: string;
    updates: Partial<CustomField>;
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
  const currentWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId;
  const [optionForm] = Form.useForm();

  // State for roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

  const [newField, setNewField] = useState<CustomField>({
    id: generateId(),
    workspaceId: currentWorkspaceId || "",
    name: "",
    description: "",
    source: "",
    type: EnumCustomFieldType.Text,
    isShowAtFront: false,
    canView: [],
    canEdit: [],
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
        isShowAtFront: false,
        canView: [],
        canEdit: [],
      });
    }
  }, [popoverPage, selectedCustomField, currentWorkspaceId]); // Fixed dependencies

  // Fetch roles when component mounts
  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await getRoles(currentWorkspaceId || "");
        if (response?.data) {
          setRoles(response.data);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
        message.error("Failed to load roles");
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const isAddMode = popoverPage === "add";

  const change = (key: string, value: any) => {
    if (key === "canEdit") {
      // When canEdit is updated, ensure all edit roles are also in canView
      if (isAddMode) {
        setNewField((prev: CustomField) => {
          // Get current canView roles
          const currentViewRoles = prev.canView || [];

          // Create a combined set of unique role IDs
          const combinedViewRoles = Array.from(
            new Set([...currentViewRoles, ...value])
          );

          return {
            ...prev,
            canEdit: value,
            canView: combinedViewRoles,
          };
        });
      } else {
        setSelectedCustomField((prev: CustomField | undefined) => {
          if (!prev) return prev;

          // Get current canView roles
          const currentViewRoles = prev.canView || [];

          // Create a combined set of unique role IDs
          const combinedViewRoles = Array.from(
            new Set([...currentViewRoles, ...value])
          );

          return {
            ...prev,
            canEdit: value,
            canView: combinedViewRoles,
          };
        });
      }
    } else {
      // For other fields, update normally
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
    }
  };

  const handleAddOption = async () => {
    const values = await optionForm.validateFields();
    if (values?.option) {
      let sanitized = values?.option?.trim();
      let option: CustomOption = {
        label: sanitized,
        value: sanitized.replaceAll(" ", "-"),
      };
      let options: CustomOption[] = [];
      if (currentField?.options) {
        options = [...currentField?.options];
      }
      options.push(option);
      change("options", options);
      optionForm.resetFields();
    }
  };

  const deleteOption = (valueToDelete: string) => {
    let options: CustomOption[] = [];
    if (currentField?.options) {
      options = [...currentField?.options];
    }
    options = options.filter((item) => item.value != valueToDelete);
    change("options", options);
  };

  const handleSave = async () => {
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
          isShowAtFront: false,
          canView: [],
          canEdit: [],
        });
      }
    } else if (!isAddMode && selectedCustomField) {
      // Update existing field
      updateCustomField({
        customFieldId: selectedCustomField.id,
        updates: selectedCustomField,
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
          <label
            htmlFor="field-name"
            className="block mb-1.5 font-medium text-gray-600"
          >
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
          <label
            htmlFor="field-description"
            className="block mb-1.5 font-medium text-gray-600"
          >
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
          <label
            htmlFor="field-type"
            className="block mb-1.5 font-medium text-gray-600"
          >
            Type
          </label>
          <Select
            size="small"
            id="field-type"
            className="w-full"
            value={currentField?.type}
            onChange={(value) => change("type", value)}
            options={[
              {
                value: EnumCustomFieldType.Text,
                label: EnumCustomFieldType.Text.toWellFormed(),
              },
              {
                value: EnumCustomFieldType.Number,
                label: EnumCustomFieldType.Number.toWellFormed(),
              },
              {
                value: EnumCustomFieldType.Dropdown,
                label: EnumCustomFieldType.Dropdown.toWellFormed(),
              },
              {
                value: EnumCustomFieldType.Date,
                label: EnumCustomFieldType.Date.toWellFormed(),
              },
              {
                value: EnumCustomFieldType.Checkbox,
                label: EnumCustomFieldType.Checkbox.toWellFormed(),
              },
            ]}
          />
        </div>

        {/* Conditional Source Field */}
        {currentField?.type === EnumCustomFieldType.Dropdown && (
          <>
            {/* Source Type */}
            <div className="mb-3 text-xs">
              <label
                htmlFor="field-source"
                className="block mb-1.5 font-medium text-gray-600"
              >
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
                  {
                    value: EnumCustomFieldSource.Custom,
                    label: EnumCustomFieldSource.Custom.toWellFormed(),
                  },
                  {
                    value: EnumCustomFieldSource.User,
                    label: EnumCustomFieldSource.User.toWellFormed(),
                  },
                ]}
              />
            </div>

            {/* Added Options */}
            {currentField?.options && (
              <>
                <label
                  htmlFor="field-source"
                  className="block mb-1.5 font-medium text-gray-600"
                >
                  Options
                </label>
                <div className="w-full">
                  {currentField.options.map((item: CustomOption) => (
                    <div
                      key={item.value}
                      className="flex gap-2 mb-1 bg-gray-100 rounded px-2"
                    >
                      <span className="w-full">{item.label}</span>
                      <Button size="small" type="text">
                        <Trash
                          size={12}
                          onClick={() => deleteOption(item.value)}
                        />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Form add option */}
            {currentField?.source === EnumCustomFieldSource.Custom && (
              <Form
                form={optionForm}
                name="add-option-form"
                className="flex items-center gap-2"
              >
                <Form.Item
                  name="option"
                  rules={[
                    { required: true, message: "Please enter option item" },
                  ]}
                >
                  <Input
                    id="field-option"
                    className="w-full"
                    size="small"
                    placeholder="option name"
                  />
                </Form.Item>
                <Form.Item>
                  <Button variant="text" type="text" onClick={handleAddOption}>
                    Add
                  </Button>
                </Form.Item>
              </Form>
            )}
          </>
        )}

        {/* Show at the front card */}
        <div className="text-[11px] flex gap-2 px-2 mb-3">
          <Checkbox
            checked={Boolean(currentField?.isShowAtFront)}
            onChange={(e) => {
              change("isShowAtFront", e.target.checked);
            }}
          />
          <span>Show at the front card</span>
        </div>

        {/* Role-based Permissions */}
        <div className="mb-3 text-xs">
          <label
            htmlFor="field-can-view"
            className="block mb-1.5 font-medium text-gray-600"
          >
            Can View (Roles)
          </label>
          {loadingRoles ? (
            <div className="flex justify-center">
              <Spin size="small" />
            </div>
          ) : (
            <Select
              size="small"
              id="field-can-view"
              className="w-full"
              mode="multiple"
              placeholder="Select roles that can view this field"
              value={currentField?.canView || []}
              onChange={(values) => change("canView", values)}
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString().toLowerCase() ?? "").includes(
                  input.toLowerCase()
                )
              }
              optionFilterProp="label"
            />
          )}
          <div className="mt-1 text-[10px] text-gray-500">
            If none selected, all roles can view this field
          </div>
        </div>

        <div className="mb-3 text-xs">
          <label
            htmlFor="field-can-edit"
            className="block mb-1.5 font-medium text-gray-600"
          >
            Can Edit (Roles)
          </label>
          {loadingRoles ? (
            <div className="flex justify-center">
              <Spin size="small" />
            </div>
          ) : (
            <Select
              size="small"
              id="field-can-edit"
              className="w-full"
              mode="multiple"
              placeholder="Select roles that can edit this field"
              value={currentField?.canEdit || []}
              onChange={(values) => change("canEdit", values)}
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString().toLowerCase() ?? "").includes(
                  input.toLowerCase()
                )
              }
              optionFilterProp="label"
            />
          )}
          <div className="mt-1 text-[10px] text-gray-500">
            If none selected, all roles can edit this field
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end items-center mt-4 pt-3 border-t border-gray-100">
        <Button variant="text" type="text" size="small" color="danger">
          Delete
        </Button>
        <Button type="primary" size="small" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default AddUpdateField;

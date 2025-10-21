"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Typography,
  Space,
  Switch,
  Divider,
  message,
  Spin,
  Checkbox,
} from "antd";
import {
  CustomField,
  EnumCustomFieldType,
  EnumCustomFieldSource,
  CustomOption,
} from "@myTypes/custom-field";
import { useCustomFields } from "@hooks/custom_field";
import { useRoles } from "@hooks/useRoles";
import { useBoards } from "@hooks/board";
import { Role } from "@myTypes/role";
import { Board } from "@myTypes/board";
import { Trash, Edit, Check, X, GripVertical } from "lucide-react";
import { Draggable, Droppable, DropResult } from "@hello-pangea/dnd";

// Dynamically import DragDropContext to avoid SSR issues
const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface CustomFieldModalProps {
  open: boolean;
  onClose: () => void;
  field?: CustomField | null;
  workspaceId: string;
}

const CustomFieldModal: React.FC<CustomFieldModalProps> = ({
  open,
  onClose,
  field,
  workspaceId,
}) => {
  const [form] = Form.useForm();
  const [optionForm] = Form.useForm();
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedViewRoles, setSelectedViewRoles] = useState<string[]>([]);
  const [selectedEditRoles, setSelectedEditRoles] = useState<string[]>([]);
  const [selectedViewBoards, setSelectedViewBoards] = useState<string[]>([]);
  const [selectedEditBoards, setSelectedEditBoards] = useState<string[]>([]);
  const [source, setSource] = useState<string>(EnumCustomFieldSource.Custom);
  const [options, setOptions] = useState<CustomOption[]>([]);
  const [roleFilterIds, setRoleFilterIds] = useState<string[]>([]);
  const [editingOptionValue, setEditingOptionValue] = useState<string | null>(
    null
  );
  const [editingOptionText, setEditingOptionText] = useState<string>("");

  const { createCustomField, updateCustomField } = useCustomFields(workspaceId);
  const { roles, loading: loadingRoles } = useRoles(workspaceId);
  const { boards, isLoading: loadingBoards } = useBoards(workspaceId);

  // Initialize form when field changes
  useEffect(() => {
    if (field) {
      const isFieldPrivate = !!(field.canView && field.canView.length > 0);
      setIsPublic(!isFieldPrivate);
      setSelectedViewRoles(field.canView || []);
      setSelectedEditRoles(field.canEdit || []);
      setSelectedViewBoards(field.canViewBoards || []);
      setSelectedEditBoards(field.canEditBoards || []);
      setSource(field.source);
      setOptions(field.options || []);
      setRoleFilterIds([]); // Reset role filters
      setEditingOptionValue(null); // Reset editing state
      setEditingOptionText("");

      form.setFieldsValue({
        name: field.name,
        description: field.description,
        type: field.type,
        isPublic: !isFieldPrivate,
        source: field.source,
        isShowAtFront: field.isShowAtFront,
      });
    } else {
      // Reset form for new field
      setIsPublic(true);
      setSelectedViewRoles([]);
      setSelectedEditRoles([]);
      setSelectedViewBoards([]);
      setSelectedEditBoards([]);
      setSource(EnumCustomFieldSource.Custom);
      setOptions([]);
      setRoleFilterIds([]);
      setEditingOptionValue(null); // Reset editing state
      setEditingOptionText("");
      form.resetFields();
      optionForm.resetFields();
    }
  }, [field, form, optionForm]);

  const handleAddOption = async () => {
    const values = await optionForm.validateFields();
    if (values?.option) {
      let sanitized = values?.option?.trim();
      let option: CustomOption = {
        label: sanitized,
        value: sanitized.replaceAll(" ", "-"),
      };
      let newOptions = [...options];
      newOptions.push(option);
      setOptions(newOptions);
      optionForm.resetFields();
    }
  };

  const deleteOption = (valueToDelete: string) => {
    let newOptions = [...options];
    newOptions = newOptions.filter((item) => item.value !== valueToDelete);
    setOptions(newOptions);
  };

  const startEditOption = (option: CustomOption) => {
    setEditingOptionValue(option.value);
    setEditingOptionText(option.label);
  };

  const saveEditOption = () => {
    if (!editingOptionValue || !editingOptionText.trim()) return;

    const newOptions = options.map((option) => {
      if (option.value === editingOptionValue) {
        return {
          ...option,
          label: editingOptionText.trim(),
          value: editingOptionText.trim().replaceAll(" ", "-"),
        };
      }
      return option;
    });

    setOptions(newOptions);
    setEditingOptionValue(null);
    setEditingOptionText("");
  };

  const cancelEditOption = () => {
    setEditingOptionValue(null);
    setEditingOptionText("");
  };

  const handleOptionDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOptions(items);
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      // Handle source encoding for user-role
      let finalSource = values.source;
      if (
        values.type === EnumCustomFieldType.Dropdown &&
        values.source === "user-role"
      ) {
        const roleEncoded = roleFilterIds.join(",");
        finalSource = `user-role:${roleEncoded}`;
      }

      const fieldData = {
        name: values.name,
        description: values.description,
        type: values.type,
        workspaceId: workspaceId,
        source:
          values.type === EnumCustomFieldType.Dropdown
            ? finalSource
            : EnumCustomFieldSource.Custom,
        options:
          values.type === EnumCustomFieldType.Dropdown ? options : undefined,
        isShowAtFront: values.isShowAtFront,
        canView: isPublic ? [] : selectedViewRoles,
        canEdit: isPublic ? [] : selectedEditRoles,
        canViewBoards: selectedViewBoards,
        canEditBoards: selectedEditBoards,
      };

      if (field) {
        // Update existing field
        await updateCustomField({ id: field.id, updates: fieldData });
        message.success("Custom field updated successfully");
      } else {
        // Create new field
        await createCustomField(fieldData);
        message.success("Custom field created successfully");
      }

      onClose();
    } catch (error) {
      message.error(
        field
          ? "Failed to update custom field"
          : "Failed to create custom field"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    optionForm.resetFields();
    setEditingOptionValue(null); // Reset editing state
    setEditingOptionText("");
    onClose();
  };

  const getFieldTypeOptions = () => [
    { value: EnumCustomFieldType.Text, label: "Text" },
    { value: EnumCustomFieldType.Number, label: "Number" },
    { value: EnumCustomFieldType.Date, label: "Date" },
    { value: EnumCustomFieldType.Checkbox, label: "Checkbox" },
    { value: EnumCustomFieldType.Dropdown, label: "Dropdown" },
  ];

  return (
    <Modal
      title={field ? "Edit Custom Field" : "Create Custom Field"}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
      bodyStyle={{ padding: "24px" }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          isPublic: false,
          source: EnumCustomFieldSource.Custom,
          isShowAtFront: false,
        }}
      >
        <Form.Item
          name="name"
          label="Field Name"
          rules={[{ required: true, message: "Please enter field name" }]}
        >
          <Input placeholder="Enter field name" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { max: 500, message: "Description cannot exceed 500 characters" },
          ]}
        >
          <TextArea rows={3} placeholder="Enter field description (optional)" />
        </Form.Item>

        <Form.Item
          name="type"
          label="Field Type"
          rules={[{ required: true, message: "Please select field type" }]}
        >
          <Select placeholder="Select field type">
            {getFieldTypeOptions().map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Source field only for Dropdown type */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.type !== currentValues.type
          }
        >
          {({ getFieldValue }) => {
            const fieldType = getFieldValue("type");
            if (fieldType === EnumCustomFieldType.Dropdown) {
              return (
                <>
                  <Form.Item
                    name="source"
                    label="Source"
                    rules={[
                      { required: true, message: "Please select field source" },
                    ]}
                  >
                    <Select
                      placeholder="Select field source"
                      onChange={(val: any) => {
                        const v =
                          typeof val === "string" ? val : val?.value ?? "";
                        setSource(v);
                        if (v !== "user-role") setRoleFilterIds([]);
                      }}
                    >
                      <Option value={EnumCustomFieldSource.Custom}>
                        Custom
                      </Option>
                      <Option value={EnumCustomFieldSource.User}>User</Option>
                      <Option value="user-role">User (by role)</Option>
                    </Select>
                  </Form.Item>

                  {/* Options for Custom source */}
                  {source === EnumCustomFieldSource.Custom && (
                    <>
                      {options.length > 0 && (
                        <Form.Item label="Options">
                          <DragDropContext onDragEnd={handleOptionDragEnd}>
                            <Droppable droppableId="custom-field-options">
                              {(provided) => (
                                <div
                                  className="w-full"
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                >
                                  {options.map((item: CustomOption, index: number) => (
                                    <Draggable
                                      key={item.value}
                                      draggableId={item.value}
                                      index={index}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex gap-2 mb-1 bg-gray-100 rounded px-2 py-1 items-center transition-all duration-200 ${
                                             snapshot.isDragging
                                               ? "bg-blue-100 shadow-lg border-2 border-blue-300 transform rotate-1"
                                               : "hover:bg-gray-200 border-2 border-transparent"
                                           }`}
                                          style={{
                                            ...provided.draggableProps.style,
                                          }}
                                        >
                                          <div
                                             {...provided.dragHandleProps}
                                             className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-300 transition-colors"
                                             title="Drag to reorder"
                                           >
                                             <GripVertical size={16} />
                                           </div>
                                          {editingOptionValue === item.value ? (
                                            <>
                                              <Input
                                                size="small"
                                                value={editingOptionText}
                                                onChange={(e) =>
                                                  setEditingOptionText(e.target.value)
                                                }
                                                onPressEnter={saveEditOption}
                                                className="flex-1"
                                                autoFocus
                                              />
                                              <Button
                                                size="small"
                                                type="text"
                                                onClick={saveEditOption}
                                                disabled={!editingOptionText.trim()}
                                              >
                                                <Check size={12} />
                                              </Button>
                                              <Button
                                                size="small"
                                                type="text"
                                                onClick={cancelEditOption}
                                              >
                                                <X size={12} />
                                              </Button>
                                            </>
                                          ) : (
                                            <>
                                              <span className="flex-1">{item.label}</span>
                                              <Button
                                                size="small"
                                                type="text"
                                                onClick={() => startEditOption(item)}
                                              >
                                                <Edit size={12} />
                                              </Button>
                                              <Button
                                                size="small"
                                                type="text"
                                                onClick={() => deleteOption(item.value)}
                                              >
                                                <Trash size={12} />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </DragDropContext>
                        </Form.Item>
                      )}

                      <Form
                        form={optionForm}
                        name="add-option-form"
                        className="flex items-center gap-2"
                      >
                        <Form.Item
                          name="option"
                          rules={[
                            {
                              required: true,
                              message: "Please enter option item",
                            },
                          ]}
                        >
                          <Input placeholder="option name" size="small" />
                        </Form.Item>
                        <Form.Item>
                          <Button type="text" onClick={handleAddOption}>
                            Add
                          </Button>
                        </Form.Item>
                      </Form>
                    </>
                  )}

                  {/* Role filter for user-role source */}
                  {source === "user-role" && (
                    <Form.Item label="Allowed Roles">
                      {loadingRoles ? (
                        <Spin size="small" />
                      ) : (
                        <Select
                          mode="multiple"
                          placeholder="Select allowed roles"
                          value={roleFilterIds}
                          onChange={(vals) =>
                            setRoleFilterIds(vals as string[])
                          }
                          options={roles.map((r) => ({
                            value: r.id,
                            label: r.name,
                          }))}
                        />
                      )}
                    </Form.Item>
                  )}
                </>
              );
            }
            return null;
          }}
        </Form.Item>

        {/* Show at front card checkbox */}
        <Form.Item name="isShowAtFront" valuePropName="checked">
          <Checkbox>Show at the front card</Checkbox>
        </Form.Item>

        <Divider />

        <Form.Item label="Visibility Settings">
          <Space direction="vertical" style={{ width: "100%" }}>
            <div className="flex items-center justify-between">
              <Text>Field Visibility</Text>
              <Switch
                checked={!isPublic}
                onChange={(checked) => setIsPublic(!checked)}
                checkedChildren="Private"
                unCheckedChildren="Public"
              />
            </div>

            {!isPublic && (
              <div className="mt-4">
                <Text type="secondary" className="block mb-2">
                  Configure which roles can view and edit this field
                </Text>

                <Form.Item
                  label="Roles that can view this field"
                  help="Leave empty to allow all roles to view. Select specific roles to restrict viewing."
                >
                  <Select
                    mode="multiple"
                    placeholder="Select roles (leave empty for all roles)"
                    value={selectedViewRoles}
                    onChange={setSelectedViewRoles}
                    loading={loadingRoles}
                    style={{ width: "100%" }}
                  >
                    {roles.map((role: Role) => (
                      <Option key={role.id} value={role.id}>
                        {role.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Roles that can edit this field"
                  help={
                    selectedViewRoles.length > 0
                      ? "Leave empty to allow only Super Admin to edit. Select specific roles to allow them to edit."
                      : "Leave empty to allow all roles to edit. Select specific roles to restrict editing."
                  }
                >
                  <Select
                    mode="multiple"
                    placeholder={
                      selectedViewRoles.length > 0
                        ? "Select roles (leave empty for Super Admin only)"
                        : "Select roles (leave empty for all roles)"
                    }
                    value={selectedEditRoles}
                    onChange={setSelectedEditRoles}
                    loading={loadingRoles}
                    style={{ width: "100%" }}
                  >
                    {roles.map((role: Role) => (
                      <Option key={role.id} value={role.id}>
                        {role.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {selectedViewRoles.length > 0 &&
                  selectedEditRoles.length === 0 && (
                    <Text type="secondary" className="block mt-2">
                      Note: When specific roles can view but no roles are
                      selected for editing, only Super Admins will be able to
                      edit this field.
                    </Text>
                  )}

                <Divider />

                <Text strong className="block mb-2">
                  Board Restrictions
                </Text>
                <Text type="secondary" className="block mb-4">
                  Restrict this field to specific boards. Leave empty to show on
                  all boards in the workspace.
                </Text>

                <Form.Item
                  label="Boards that can view this field"
                  help="Select boards where this field should be visible. Leave empty for all boards."
                >
                  <Select
                    mode="multiple"
                    placeholder="Select boards (leave empty for all boards)"
                    value={selectedViewBoards}
                    onChange={setSelectedViewBoards}
                    loading={loadingBoards}
                    style={{ width: "100%" }}
                  >
                    {boards.map((board: Board) => (
                      <Option key={board.id} value={board.id}>
                        {board.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* <Form.Item
                  label="Boards that can edit this field"
                  help="Select boards where this field can be edited. Leave empty to follow view permissions."
                >
                  <Select
                    mode="multiple"
                    placeholder="Select boards (leave empty to follow view permissions)"
                    value={selectedEditBoards}
                    onChange={setSelectedEditBoards}
                    loading={loadingBoards}
                    style={{ width: "100%" }}
                  >
                    {boards.map((board: Board) => (
                      <Option key={board.id} value={board.id}>
                        {board.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item> */}
              </div>
            )}

            {!isPublic && (
              <div className="mt-4">
                <Text type="secondary">
                  Private fields are only visible to selected roles
                </Text>
              </div>
            )}
          </Space>
        </Form.Item>

        <div className="flex justify-end space-x-2 mt-6">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            {field ? "Update" : "Create"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CustomFieldModal;

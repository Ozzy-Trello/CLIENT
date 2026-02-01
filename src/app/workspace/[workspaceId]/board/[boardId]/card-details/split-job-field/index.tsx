import React, { useState, useEffect } from "react";
import { Card } from "@myTypes/card";
import { useParams } from "next/navigation";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Spin,
  Typography,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  useSplitJobTemplates,
  useSplitJobValuesByCustomField,
} from "@hooks/split_job";
import { SplitJobTemplate, SplitJobValue } from "@api/split_job";
import { Split } from "lucide-react";

const { Title, Text } = Typography;

interface SplitJobFieldsProps {
  card: Card;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
}

const SplitJobFields: React.FC<SplitJobFieldsProps> = ({ card, setCard }) => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const cardId = card.id;

  // State for managing the form modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<SplitJobTemplate | null>(null);
  const [selectedValue, setSelectedValue] = useState<SplitJobValue | null>(
    null
  );
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // Get all values for this card grouped by custom field
  const {
    groupedValues,
    isLoading: isLoadingValues,
    createValue,
    updateValue,
    deleteValue,
    isCreating,
    isUpdating,
    isDeleting,
    refetch,
  } = useSplitJobValuesByCustomField(cardId);

  // Effect to refetch values when card changes
  useEffect(() => {
    if (cardId) {
      refetch();
    }
  }, [cardId, refetch]);

  // Get templates for the values in this card
  const { templates, isLoading: isLoadingTemplates } =
    useSplitJobTemplates(workspaceId);

  const relevantTemplates = card.customFields
    ? templates.filter((template) =>
        // @ts-ignore
        card.customFields.some(
          (field: any) => field.id === template.custom_field_id
        )
      )
    : [];

  // Count total values across all custom fields
  const totalValuesCount = Object.values(groupedValues).reduce(
    (count, values) => count + values.length,
    0
  );

  // Handle direct value update
  const handleValueChange = async (valueId: string, newValue: number) => {
    try {
      await updateValue(valueId, newValue);
    } catch (error) {
      messageApi.error("Failed to update value");
      console.error(error);
    }
  };

  // Handle opening the modal to add a new split job value
  const handleAddValue = (template: SplitJobTemplate) => {
    setSelectedTemplate(template);
    setIsAddModalOpen(true);
    addForm.resetFields();
  };

  // Handle opening the modal to edit a split job value
  const handleEditValue = (value: SplitJobValue) => {
    setSelectedValue(value);
    setIsEditModalOpen(true);
    editForm.setFieldsValue({
      name: value.name,
      value: value.value,
    });
  };

  // Handle direct deletion of a split job value
  const handleDeleteValue = async (value: SplitJobValue) => {
    try {
      await deleteValue(value.id);
      messageApi.success("Split job value deleted successfully");
    } catch (error) {
      messageApi.error("Failed to delete split job value");
      console.error(error);
    }
  };

  // Handle creating a new split job value
  const handleCreateValue = async (values: { name: string; value: number }) => {
    if (!selectedTemplate) return;

    try {
      await createValue({
        templateId: selectedTemplate.id,
        name: values.name,
        value: values.value,
      });

      messageApi.success("Split job value added successfully");
      setIsAddModalOpen(false);
      addForm.resetFields();
    } catch (error) {
      messageApi.error("Failed to add split job value");
      console.error(error);
    }
  };

  // Handle updating a split job value
  const handleUpdateValue = async (values: { name: string; value: number }) => {
    if (!selectedValue) return;

    try {
      // First update the value
      await updateValue(selectedValue.id, values.value);

      messageApi.success("Split job value updated successfully");
      setIsEditModalOpen(false);
      editForm.resetFields();
    } catch (error) {
      messageApi.error("Failed to update split job value");
      console.error(error);
    }
  };

  // This function is no longer needed as we delete directly

  // Show loading state
  if (isLoadingTemplates || isLoadingValues) {
    return (
      <div className="mt-6">
        <Title level={5} className="mb-0">
          Split Jobs
        </Title>
        <div className="ml-8 mt-2">
          <Spin size="small" />
        </div>
      </div>
    );
  }

  // Get custom field names for each template
  const getCustomFieldName = (customFieldId: string) => {
    if (!card.customFields || !Array.isArray(card.customFields)) {
      return "Unknown Field";
    }
    const field = card.customFields.find(
      (field: any) => field.id === customFieldId
    );
    return field ? field.name : "Unknown Field";
  };

  return (
    <div className="mt-6">
      {contextHolder}
      {relevantTemplates.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Split size={18} className="text-gray-700" />
            <span className="text-[18px] font-semibold text-gray-900">
              Split Jobs
            </span>
          </div>
        </div>
      )}

      <div className="ml-8 mt-2">
        {/* Show values grouped by custom field */}
        {totalValuesCount > 0 ? (
          <div>
            {Object.entries(groupedValues).map(([customFieldName, values]) => (
              <div key={customFieldName} className="mb-6">
                <div className="mb-2">
                  <Text strong>
                    {customFieldName
                      .replace(/([a-z])([A-Z])/g, "$1 $2")
                      .replace(/^./, (str) => str.toUpperCase())}
                  </Text>
                </div>

                <List
                  size="small"
                  dataSource={values}
                  renderItem={(value) => {
                    // Find the template for this value
                    const template = templates.find(
                      (t) => t.id === value.split_job_template_id
                    );

                    return (
                      <List.Item
                        actions={[
                          <Button
                            key="delete"
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            onClick={() => handleDeleteValue(value)}
                          />,
                        ]}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <Text strong>{value.name}</Text>
                            {template && (
                              <div>
                                <Text type="secondary" className="text-xs">
                                  {template.name}
                                </Text>
                              </div>
                            )}
                          </div>
                          <InputNumber
                            size="small"
                            min={0}
                            defaultValue={Number(value.value)}
                            onChange={(newValue) => {
                              if (newValue !== null) {
                                handleValueChange(value.id, newValue);
                              }
                            }}
                            className="w-20"
                          />
                        </div>
                      </List.Item>
                    );
                  }}
                />
                <Divider className="my-4" />
              </div>
            ))}

            {/* Show add buttons for available templates */}
            {relevantTemplates.length > 0 && (
              <div className="mt-4">
                <Text type="secondary">Add more split job values:</Text>
                <div className="mt-2">
                  {relevantTemplates.map((template) => (
                    <Button
                      key={template.id}
                      type="default"
                      icon={<PlusOutlined />}
                      size="small"
                      className="mr-2 mb-2"
                      onClick={() => handleAddValue(template)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : relevantTemplates.length > 0 ? (
          <div className="mb-6">
            <Alert
              message="No split job values"
              description={
                <div>
                  <p>
                    This card has no split job values yet. Click the button
                    below to add one.
                  </p>
                  <div className="mt-2">
                    {relevantTemplates.map((template) => (
                      <Button
                        key={template.id}
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        className="mr-2 mb-2"
                        onClick={() => handleAddValue(template)}
                      >
                        Add to {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        ) : null}
      </div>

      {/* Modal for adding new split job value */}
      <Modal
        title={`Add value to ${selectedTemplate?.name || ""}`}
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        footer={null}
      >
        <Form form={addForm} layout="vertical" onFinish={handleCreateValue}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="e.g., frontend development" />
          </Form.Item>

          <Form.Item
            name="value"
            label="Value"
            rules={[{ required: true, message: "Please enter a value" }]}
          >
            <Input type="number" min={0} max={100} placeholder="e.g., 25" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isCreating}>
              Add
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal for editing split job value */}
      <Modal
        title={`Edit ${selectedValue?.name || ""}`}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateValue}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input placeholder="e.g., frontend development" disabled />
          </Form.Item>

          <Form.Item
            name="value"
            label="Value"
            rules={[{ required: true, message: "Please enter a value" }]}
          >
            <Input type="number" min={0} max={100} placeholder="e.g., 25" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isUpdating}>
              Update
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Delete confirmation modal removed */}
    </div>
  );
};

export default SplitJobFields;

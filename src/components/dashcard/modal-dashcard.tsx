import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  Modal,
  Typography,
  Table,
  Space,
  message,
  ColorPicker,
} from "antd";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  DashcardConfig,
  DashcardFilter,
  dashcardsFilter,
  EnumCardAttributeType,
  FilterOperator,
  FilterOption,
  FilterValue,
} from "@myTypes/dashcard";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { CustomField } from "@myTypes/custom-field";
import { UserSelection } from "@components/selection";

const { Text } = Typography;

interface ModalDashcardProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialData?: DashcardConfig | null;
  onSave: (config: DashcardConfig) => void;
}

const ModalDashcard: React.FC<ModalDashcardProps> = ({
  open,
  setOpen,
  initialData,
  onSave,
}) => {
  const { workspaceId } = useParams();
  const [form] = Form.useForm();
  const [bgColor, setBgColor] = useState<string>(
    initialData?.backgroundColor || "#4e95ff"
  );
  const [dashcardName, setDashcardName] = useState<string>(
    initialData?.name || "Dashcard"
  );
  const [selectedFilters, setSelectedFilters] = useState<DashcardFilter[]>(
    initialData?.filters || dashcardsFilter.slice(0, 3)
  );
  const [cardCount, setCardCount] = useState<number>(0);
  const [availableFilters, setAvailableFilters] = useState<DashcardFilter[]>(
    []
  );
  const { customFields } = useCustomFields(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
  );

  // Initialize available filters
  useEffect(() => {
    // Filter out already selected filters
    const selectedIds = selectedFilters.map((filter) => filter.id);
    const remaining = dashcardsFilter.filter(
      (filter) => !selectedIds.includes(filter.id)
    );
    console.log(remaining, "<< ini remaining");
    setAvailableFilters(remaining);
  }, [selectedFilters]);

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      console.log(initialData, "<< initial data");
      setBgColor(initialData.backgroundColor);
      setDashcardName(initialData.name);
      setSelectedFilters(initialData.filters);
      form.setFieldsValue({
        name: initialData.name,
        background: initialData.backgroundColor,
      });
    } else {
      // Reset to defaults for new dashcard
      setBgColor("#4e95ff");
      setDashcardName("Dashcard");
      setSelectedFilters(dashcardsFilter.slice(0, 3));
      form.resetFields();
    }
  }, [initialData, form, open]);

  // add custom field to the dashcard filters
  useEffect(() => {
    if (customFields && customFields.length > 0) {
      console.log("customFields: %o", customFields);
      const customFieldFilters: DashcardFilter[] = customFields.map(
        (item: CustomField) => ({
          id: item.id,
          label: item.name,
          groupType: "custom",
          type: EnumCardAttributeType.CUSTOM_FIELD,
          value: "",
          operator: "equals" as FilterOperator,
          field: item,
          options: [
            { label: "any", value: "any" },
            { label: "select", value: "select" },
          ],
        })
      );

      // Push custom fields to dashcardsFilter if not already there
      const existingIds = dashcardsFilter.map((f) => f.id);
      customFieldFilters.forEach((cf) => {
        if (!existingIds.includes(cf.id)) {
          dashcardsFilter.push(cf);
        }
      });

      // Only add custom fields that aren't already in the filters
      setSelectedFilters((prev) => {
        const existingCustomFieldIds = prev
          .filter((f) => f.type === EnumCardAttributeType.CUSTOM_FIELD)
          .map((f) => f.id);
        const newCustomFields = customFieldFilters.filter(
          (cf) => !existingCustomFieldIds.includes(cf.id)
        );
        return [...prev, ...newCustomFields];
      });
    }
  }, [customFields]);

  const handleColorChange = (color: any) => {
    setBgColor(color.toHexString());
  };

  const handleFilterOperatorChange = (filterId: string, value: string) => {
    setSelectedFilters((prev) =>
      prev.map((filter) =>
        filter.id === filterId
          ? { ...filter, operator: value as FilterOperator }
          : filter
      )
    );
  };

  const handleFilterValueChange = (filterId: string, value: FilterValue) => {
    setSelectedFilters((prev) =>
      prev.map((filter) =>
        filter.id === filterId ? { ...filter, value } : filter
      )
    );
  };

  const addFilter = (filterId: string) => {
    const filterToAdd = availableFilters.find((f) => f.id === filterId);
    if (filterToAdd) {
      setSelectedFilters((prev) => [...prev, filterToAdd]);
      // Remove from available
      setAvailableFilters((prev) => prev.filter((f) => f.id !== filterId));
    }
  };

  const removeFilter = (filterId: string) => {
    const filterToRemove = selectedFilters.find((f) => f.id === filterId);
    if (filterToRemove) {
      // Remove from selected
      setSelectedFilters((prev) => prev.filter((f) => f.id !== filterId));
      // Add back to available
      setAvailableFilters((prev) => [...prev, filterToRemove]);
    }
  };

  const onFinish = () => {
    const values = form.getFieldsValue();

    const cleanedFilters = selectedFilters.map((filter) => {
      const { id, type, operator, value } = filter;
      return { id, type, operator, value };
    });

    const dashcardConfig: DashcardConfig = {
      id: initialData?.id || uuidv4(),
      name: values.name || dashcardName,
      backgroundColor: bgColor,
      filters: cleanedFilters,
    };

    console.log(
      "[Dashcard SAVE] payload:",
      JSON.stringify(dashcardConfig, null, 2)
    );
    onSave(dashcardConfig);
    setOpen(false);
  };

  const onFinishFailed = () => {
    message.error("Please check your input and try again.");
  };

  const onAssignedChange = (value: string, option: any) => {
    handleFilterValueChange("assigned", value);
  };

  return (
    <Modal
      className="modal-dashcard"
      open={open}
      onCancel={() => setOpen(false)}
      title="Dashcards — Track"
      footer={null}
      centered
      destroyOnClose
      width={600}
    >
      <Form
        name="create-dashcard-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        requiredMark={false}
        initialValues={{
          name: dashcardName,
          background: bgColor,
        }}
      >
        <div className="modal-dashcard-content p-4">
          <div className="flex flex-row gap-6">
            {/* Left side - Card Preview */}
            <div className="w-[200px]">
              <div
                className="rounded-md p-4 flex flex-col items-center justify-center h-[180px] transition-all"
                style={{ backgroundColor: bgColor }}
              >
                <div className="text-white text-6xl font-bold">{cardCount}</div>
                <div className="text-white text-xl mt-2">{dashcardName}</div>
              </div>
            </div>

            {/* Right side - Card Settings */}
            <div className="flex-1">
              <Form.Item
                className="mb-2"
                label={<Text strong>Name</Text>}
                name="name"
                rules={[{ required: true, message: "Please enter a name" }]}
              >
                <Input
                  value={dashcardName}
                  onChange={(e) => setDashcardName(e.target.value)}
                  placeholder="Enter dashcard name"
                />
              </Form.Item>

              <Form.Item
                name="background"
                label={<Text strong>Change background</Text>}
              >
                <ColorPicker
                  defaultFormat="hex"
                  format="hex"
                  value={bgColor}
                  disabledAlpha={false}
                  onChange={handleColorChange}
                  showText={true}
                />
              </Form.Item>
            </div>
          </div>

          <div className="filter-section mt-6">
            <Text strong>Filter Criteria</Text>
            <div className="py-2 space-y-3 my-2">
              <table className="w-full">
                <tbody>
                  {selectedFilters.map((filter) => (
                    <tr
                      key={filter.id}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="py-2 pr-2 w-24">
                        <Text>{filter.label}</Text>
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          size="small"
                          className="min-w-32"
                          options={filter.options}
                          value={filter.operator}
                          onChange={(value) =>
                            handleFilterOperatorChange(filter.id, value)
                          }
                        />
                      </td>
                      <td className="py-2 px-2 flex-1">
                        {filter.type === EnumCardAttributeType.IS_COMPLETED ? (
                          <Select
                            size="small"
                            options={[
                              { label: "No", value: "false" },
                              { label: "Yes", value: "true" },
                            ]}
                            value={filter.value?.toString() || "false"}
                            onChange={(value) =>
                              handleFilterValueChange(
                                filter.id,
                                value === "true"
                              )
                            }
                          />
                        ) : filter.type === EnumCardAttributeType.ASSIGNED ? (
                          <UserSelection onChange={onAssignedChange} />
                        ) : filter.type ===
                          EnumCardAttributeType.CUSTOM_FIELD ? (
                          (() => {
                            const field = (filter as any).field as
                              | CustomField
                              | undefined;
                            if (!field) {
                              return (
                                <Input
                                  size="small"
                                  placeholder="Value"
                                  value={(filter.value as string) || ""}
                                  onChange={(e) =>
                                    handleFilterValueChange(
                                      filter.id,
                                      e.target.value
                                    )
                                  }
                                />
                              );
                            }

                            // Dropdown type
                            if (field.type === "dropdown") {
                              if (field.source === "user") {
                                return (
                                  <UserSelection
                                    width="100%"
                                    size="small"
                                    value={filter.value as string}
                                    onChange={(val: string) =>
                                      handleFilterValueChange(filter.id, val)
                                    }
                                  />
                                );
                              } else if (
                                field.source?.startsWith("user-role:")
                              ) {
                                // Role-based user selection
                                const roleIds = field.source
                                  .slice(10)
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                return (
                                  <UserSelection
                                    width="100%"
                                    size="small"
                                    value={filter.value as string}
                                    onChange={(val: string) =>
                                      handleFilterValueChange(filter.id, val)
                                    }
                                    roleIds={roleIds}
                                  />
                                );
                              }

                              // custom dropdown
                              const opts = (field.options || []).map(
                                (o: any) => ({
                                  label: o.label,
                                  value: o.value,
                                })
                              );
                              return (
                                <Select
                                  size="small"
                                  className="w-full"
                                  options={opts}
                                  value={filter.value as string}
                                  onChange={(val: string) =>
                                    handleFilterValueChange(filter.id, val)
                                  }
                                />
                              );
                            }

                            // Fallback text input
                            return (
                              <Input
                                size="small"
                                placeholder="Value"
                                value={(filter.value as string) || ""}
                                onChange={(e) =>
                                  handleFilterValueChange(
                                    filter.id,
                                    e.target.value
                                  )
                                }
                              />
                            );
                          })()
                        ) : (
                          <Input
                            size="small"
                            placeholder="Type and press enter"
                            value={(filter.value as string) || ""}
                            onChange={(e) =>
                              handleFilterValueChange(filter.id, e.target.value)
                            }
                          />
                        )}
                      </td>
                      <td className="py-2 pl-2 w-8">
                        <Button
                          type="text"
                          size="small"
                          icon={<Trash2 size={16} />}
                          onClick={() => removeFilter(filter.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {availableFilters.length > 0 && (
            <Select
              className="w-48 mt-2"
              placeholder="Add more filters"
              size="small"
              options={availableFilters.map((f) => ({
                label: f.label,
                value: f.id,
              }))}
              onChange={addFilter}
              value={null}
              suffixIcon={<Plus size={16} />}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 p-2 border-t">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {initialData ? "Update dashcard" : "Start tracking"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ModalDashcard;

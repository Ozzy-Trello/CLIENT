import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
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
  DashcardDisplayType,
  DashcardDisplayConfig,
} from "@myTypes/dashcard";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { CustomField, EnumCustomFieldType } from "@myTypes/custom-field";
import { UserSelection, LabelSelection } from "@components/selection";
import { useBoards } from "@hooks/board";
import { useLists } from "@hooks/list";
import { LookupCache } from "@utils/lookup-cache";
import { useAccountList } from "@hooks/account";
import { useLabels } from "@hooks/label";

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
  const { workspaceId, boardId } = useParams();
  const [form] = Form.useForm();
  const [bgColor, setBgColor] = useState<string>(
    initialData?.backgroundColor || "#4e95ff"
  );
  const [dashcardName, setDashcardName] = useState<string>(
    initialData?.name || "Dashcard"
  );
  const [selectedFilters, setSelectedFilters] = useState<DashcardFilter[]>(
    initialData?.filters || dashcardsFilter.slice(0, 3) // Default to first 3 filters
  );
  const [cardCount, setCardCount] = useState<number>(0);
  const [availableFilters, setAvailableFilters] = useState<DashcardFilter[]>(
    []
  );
  const [displayConfig, setDisplayConfig] = useState<DashcardDisplayConfig>(
    initialData?.displayConfig || {
      type: DashcardDisplayType.CARD_COUNT,
    }
  );

  // Add hooks for boards and lists
  const { customFields } = useCustomFields(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
  );
  const { boards: boardsArr } = useBoards(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
  );
  const boardOptions = (boardsArr || []).map((b: any) => ({
    label: b.name || "",
    value: b.id,
  }));

  // Get current board ID for list fetching
  const currentBoardId = Array.isArray(boardId) ? boardId[0] : boardId;

  // Fetch lists from the current board only
  const { lists: currentBoardLists } = useLists(currentBoardId || "");
  const listOptions = (currentBoardLists || []).map((l: any) => ({
    label: l.name || "",
    value: l.id,
  }));

  // Fetch users for the current workspace and board
  const { data: users } = useAccountList({
    workspaceId: Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || "",
    boardId: currentBoardId || "",
  });

  // Fetch labels for the current workspace
  const { allLabels } = useLabels(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId || ""
  );

  // Populate LookupCache with data for friendly name display
  useEffect(() => {
    // Populate boards
    if (boardsArr && boardsArr.length > 0) {
      LookupCache.rememberMany("board", boardsArr.map((b: any) => ({ id: b.id, name: b.name })));
    }

    // Populate lists
    if (currentBoardLists && currentBoardLists.length > 0) {
      LookupCache.rememberMany("list", currentBoardLists.map((l: any) => ({ id: l.id, name: l.name })));
    }

    // Populate users
    if (users?.data && users.data.length > 0) {
      LookupCache.rememberMany("user", users.data.map((u: any) => ({ id: u.id, name: u.name || u.email })));
    }

    // Populate custom fields
    if (customFields && customFields.length > 0) {
      LookupCache.rememberMany("field", customFields.map((f: any) => ({ id: f.id, name: f.name })));
    }

    // Populate labels
    if (allLabels && allLabels.length > 0) {
      LookupCache.rememberMany("label", allLabels.map((l: any) => ({ id: l.id, name: l.name })));
    }
  }, [boardsArr, currentBoardLists, users, customFields, allLabels]);

  // Initialize available filters
  useEffect(() => {
    // Filter out already selected filters
    const selectedIds = selectedFilters.map((filter) => filter.id);
    const remaining = dashcardsFilter.filter(
      (filter) => !selectedIds.includes(filter.id)
    );
    setAvailableFilters(remaining);
  }, [selectedFilters]);

  // Helper function to get display value for dropdowns using LookupCache
  const getDisplayValue = (filter: DashcardFilter): string => {
    if (!filter.value || filter.value === "") return "";
    
    const value = filter.value as string;
    
    // For due date filters - handle complex format
    if (filter.type === EnumCardAttributeType.DUE_DATE) {
      if (typeof filter.value === 'object' && filter.value !== null) {
        const dueDateValue = filter.value as any;
        if (dueDateValue.type === 'later than' || dueDateValue.type === 'earlier than') {
          return `${dueDateValue.type} ${dueDateValue.number} ${dueDateValue.unit} ${dueDateValue.reference}`;
        }
        return dueDateValue.type || value;
      }
      return value;
    }
    
    // Try to get friendly name from LookupCache first
    const cachedName = LookupCache.any(value);
    if (cachedName) return cachedName;
    
    // For board filters - fallback to options
    if (filter.type === EnumCardAttributeType.BOARD) {
      const board = boardOptions.find(b => b.value === value);
      return board?.label || value;
    }
    
    // For list filters - fallback to options
    if (filter.type === EnumCardAttributeType.LIST) {
      const list = listOptions.find(l => l.value === value);
      return list?.label || value;
    }
    
    // For custom field dropdowns - fallback to options
    if (filter.type === EnumCardAttributeType.CUSTOM_FIELD) {
      const customFilter = filter as any;
      if (customFilter.field?.type === EnumCustomFieldType.Dropdown && customFilter.field?.options) {
        const option = customFilter.field.options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
    }
    
    return value;
  };

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      setBgColor(initialData.backgroundColor);
      setDashcardName(initialData.name);
      setSelectedFilters(initialData.filters);
      setDisplayConfig(initialData.displayConfig || {
        type: DashcardDisplayType.CARD_COUNT,
      });
      form.setFieldsValue({
        name: initialData.name,
        background: initialData.backgroundColor,
      });
    } else {
      // Reset to defaults for new dashcard
      setBgColor("#4e95ff");
      setDashcardName("Dashcard");
      setSelectedFilters([]);
      setDisplayConfig({
        type: DashcardDisplayType.CARD_COUNT,
      });
      form.resetFields();
    }
  }, [initialData, form, open]);

  // add custom field to the dashcard filters
  useEffect(() => {
    if (customFields && customFields.length > 0) {
      const customFieldFilters: DashcardFilter[] = customFields.map(
        (item: CustomField) => {
          // Define options based on field type
          let options: FilterOption[] = [];
          let defaultOperator: FilterOperator = FilterOperator.EQUALS;

          if (item.type === EnumCustomFieldType.Number) {
            options = [
              { label: "is between", value: FilterOperator.IS_BETWEEN },
              { label: "any value", value: FilterOperator.ANY_VALUE },
              { label: "no value", value: FilterOperator.NO_VALUE },
            ];
            defaultOperator = FilterOperator.IS_BETWEEN;
          } else if (item.type === EnumCustomFieldType.Date) {
            // Use the same options as due date filters
            options = [
              { label: "today", value: "today" },
              { label: "this week", value: "this_week" },
              { label: "this month", value: "this_month" },
              { label: "in the past", value: "in_the_past" },
              { label: "in the future", value: "in_the_future" },
              { label: "any time", value: "any_time" },
              { label: "no date", value: "no_date" },
              { label: "later than", value: "later_than" },
              { label: "earlier than", value: "earlier_than" },
            ];
            defaultOperator = "today" as FilterOperator;
          } else {
            options = [
              { label: "any", value: "any" },
              { label: "select", value: "select" },
            ];
          }

          return {
            id: item.id,
            label: item.name,
            groupType: "custom",
            type: EnumCardAttributeType.CUSTOM_FIELD,
            value: "",
            operator: defaultOperator,
            field: item,
            options,
          };
        }
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

    const dashcardConfig: DashcardConfig = {
      id: initialData?.id || uuidv4(),
      name: values.name || dashcardName,
      backgroundColor: bgColor,
      filters: selectedFilters,
      displayConfig: displayConfig,
    };

    console.log(
      "[Dashcard SAVE] payload:",
      JSON.stringify(dashcardConfig, null, 2)
    );
    onSave(dashcardConfig);
    message.success(
      `${initialData ? "Updated" : "Created"} dashcard successfully`
    );
  };

  const onFinishFailed = () => {
    message.error("Please check your input and try again.");
  };

  // Due Date Filter Component
  const DueDateFilterComponent = ({ filter }: { filter: DashcardFilter }) => {
    const [number, setNumber] = useState<number>(1);
    const [unit, setUnit] = useState<string>('day');
    const [reference, setReference] = useState<string>('ago');

    const unitOptions = [
      { label: 'day', value: 'day' },
      { label: 'week', value: 'week' },
      { label: 'month', value: 'month' },
    ];

    const referenceOptions = [
      { label: 'ago', value: 'ago' },
      { label: 'from now', value: 'from_now' },
    ];

    // Get the selected option from the filter operator
    const selectedOption = filter.operator as string || '';

    useEffect(() => {
      if (filter.value && typeof filter.value === 'object') {
        const value = filter.value as any;
        setNumber(value.number || 1);
        setUnit(value.unit || 'day');
        setReference(value.reference || 'ago');
      }
    }, [filter.value]);

    const handleComplexValueChange = (newNumber?: number, newUnit?: string, newReference?: string) => {
      if (selectedOption === 'later_than' || selectedOption === 'earlier_than') {
        handleFilterValueChange(filter.id, {
          type: selectedOption,
          number: newNumber !== undefined ? newNumber : number,
          unit: newUnit !== undefined ? newUnit : unit,
          reference: newReference !== undefined ? newReference : reference,
        } as any);
      }
    };

    const isComplexOption = selectedOption === 'later_than' || selectedOption === 'earlier_than';

    // For complex options (later than, earlier than), show only the three inputs
    if (isComplexOption) {
      return (
        <Space>
          <InputNumber
            size="small"
            min={1}
            value={number}
            onChange={(value) => {
              const newNumber = value || 1;
              setNumber(newNumber);
              handleComplexValueChange(newNumber);
            }}
            style={{ width: 60 }}
          />
          <Select
            size="small"
            value={unit}
            onChange={(value) => {
              setUnit(value);
              handleComplexValueChange(undefined, value);
            }}
            style={{ width: 80 }}
            options={unitOptions}
          />
          <Select
            size="small"
            value={reference}
            onChange={(value) => {
              setReference(value);
              handleComplexValueChange(undefined, undefined, value);
            }}
            style={{ width: 90 }}
            options={referenceOptions}
          />
        </Space>
      );
    }

    // For simple options, show nothing (just the operator dropdown)
    return null;
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

              <Form.Item
                label={<Text strong>Display Type</Text>}
              >
                <Select
                  value={displayConfig.type}
                  onChange={(value: DashcardDisplayType) => {
                    setDisplayConfig({
                      type: value,
                      customFieldId: value === DashcardDisplayType.CUSTOM_FIELD_SUM ? displayConfig.customFieldId : undefined,
                    });
                  }}
                  options={[
                    { label: "Card Count", value: DashcardDisplayType.CARD_COUNT },
                    { label: "Custom Field Sum", value: DashcardDisplayType.CUSTOM_FIELD_SUM },
                  ]}
                />
              </Form.Item>

              {displayConfig.type === DashcardDisplayType.CUSTOM_FIELD_SUM && (
                <Form.Item
                  label={<Text strong>Custom Field</Text>}
                >
                  <Select
                    value={displayConfig.customFieldId}
                    onChange={(value: string) => {
                      setDisplayConfig({
                        ...displayConfig,
                        customFieldId: value,
                      });
                    }}
                    placeholder="Select a numeric custom field"
                    options={customFields
                      ?.filter(field => field.type === EnumCustomFieldType.Number)
                      .map(field => ({
                        label: field.name,
                        value: field.id,
                      })) || []
                    }
                  />
                </Form.Item>
              )}
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
                        {filter.type === EnumCardAttributeType.BOARD ? (
                          <Select
                            size="small"
                            className="min-w-32"
                            options={boardOptions}
                            value={filter.value as string}
                            onChange={(value: string) =>
                              handleFilterValueChange(filter.id, value)
                            }
                            placeholder="Select board"
                          />
                        ) : filter.type === EnumCardAttributeType.LIST ? (
                          <Select
                            size="small"
                            className="min-w-32"
                            options={listOptions}
                            value={filter.value as string}
                            onChange={(value: string) =>
                              handleFilterValueChange(filter.id, value)
                            }
                            placeholder="Select list"
                          />
                        ) : filter.type === EnumCardAttributeType.ASSIGNED ? (
                           <UserSelection
                             placeholder="Select user"
                             width="100%"
                             onChange={(value: string) =>
                               handleFilterValueChange(filter.id, value)
                             }
                             value={filter.value as string}
                           />
                         ) : filter.type === EnumCardAttributeType.CUSTOM_FIELD ? (
                           (() => {
                             const field = (filter as any).field as CustomField | undefined;
                             if (!field) {
                               return (
                                 <Input
                                   size="small"
                                   placeholder="Type and press enter"
                                   value={(filter.value as string) || ""}
                                   onChange={(e) =>
                                     handleFilterValueChange(filter.id, e.target.value)
                                   }
                                 />
                               );
                             }

                             // Handle different custom field types
                             switch (field.type) {
                               case EnumCustomFieldType.Dropdown:
                                 if (field.source === "user") {
                                   return (
                                     <UserSelection
                                       placeholder="Select user"
                                       width="100%"
                                       onChange={(value: string) =>
                                         handleFilterValueChange(filter.id, value)
                                       }
                                       value={filter.value as string}
                                     />
                                   );
                                 } else if (field.source?.startsWith("user-role:")) {
                                   // Role-based user selection
                                   const roleIds = field.source
                                     .slice(10)
                                     .split(",")
                                     .map((s) => s.trim())
                                     .filter(Boolean);
                                   return (
                                     <UserSelection
                                       placeholder="Select user"
                                       width="100%"
                                       onChange={(value: string) =>
                                         handleFilterValueChange(filter.id, value)
                                       }
                                       value={filter.value as string}
                                       roleIds={roleIds}
                                     />
                                   );
                                 }

                                 // Custom dropdown
                                 const opts = (field.options || []).map((o: any) => ({
                                   label: o.label,
                                   value: o.value,
                                 }));
                                 return (
                                   <Select
                                     size="small"
                                     className="min-w-32"
                                     options={opts}
                                     value={filter.value as string}
                                     onChange={(value: string) =>
                                       handleFilterValueChange(filter.id, value)
                                     }
                                     placeholder="Select option"
                                   />
                                 );

                               case EnumCustomFieldType.Checkbox:
                                 return (
                                   <Select
                                     size="small"
                                     className="min-w-32"
                                     options={[
                                       { label: "Unchecked", value: "false" },
                                       { label: "Checked", value: "true" },
                                     ]}
                                     value={filter.value?.toString() || "false"}
                                     onChange={(value: string) =>
                                       handleFilterValueChange(filter.id, value === "true")
                                     }
                                     placeholder="Select state"
                                   />
                                 );

                               case EnumCustomFieldType.Number:
                                 if (filter.operator === FilterOperator.IS_BETWEEN) {
                                   const rangeValue = filter.value as { from?: string; to?: string } || {};
                                   return (
                                     <div className="flex items-center gap-2">
                                       <Input
                                         size="small"
                                         type="number"
                                         placeholder="From"
                                         value={rangeValue.from || ""}
                                         onChange={(e) => {
                                           const newValue = { ...rangeValue, from: e.target.value };
                                           handleFilterValueChange(filter.id, newValue);
                                         }}
                                         style={{ width: 80 }}
                                       />
                                       <span className="text-gray-500">to</span>
                                       <Input
                                         size="small"
                                         type="number"
                                         placeholder="To (optional)"
                                         value={rangeValue.to || ""}
                                         onChange={(e) => {
                                           const newValue = { ...rangeValue, to: e.target.value };
                                           handleFilterValueChange(filter.id, newValue);
                                         }}
                                         style={{ width: 80 }}
                                       />
                                     </div>
                                   );
                                 } else if (filter.operator === FilterOperator.ANY_VALUE || filter.operator === FilterOperator.NO_VALUE) {
                                   return (
                                     <span className="text-gray-500 text-sm">
                                       {filter.operator === FilterOperator.ANY_VALUE ? "Any value" : "No value"}
                                     </span>
                                   );
                                 } else {
                                   return (
                                     <Input
                                       size="small"
                                       type="number"
                                       placeholder="Enter number"
                                       value={(filter.value as string) || ""}
                                       onChange={(e) =>
                                         handleFilterValueChange(filter.id, e.target.value)
                                       }
                                     />
                                   );
                                 }

                               case EnumCustomFieldType.Date:
                                 return (
                                   <Input
                                     size="small"
                                     type="date"
                                     placeholder="Select date"
                                     value={(filter.value as string) || ""}
                                     onChange={(e) =>
                                       handleFilterValueChange(filter.id, e.target.value)
                                     }
                                   />
                                 );

                               case EnumCustomFieldType.Text:
                               default:
                                 return (
                                   <Input
                                     size="small"
                                     placeholder="Enter text"
                                     value={(filter.value as string) || ""}
                                     onChange={(e) =>
                                       handleFilterValueChange(filter.id, e.target.value)
                                     }
                                   />
                                 );
                             }
                           })()
                        ) : filter.type === EnumCardAttributeType.IS_COMPLETED ? (
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
                        ) : filter.type === EnumCardAttributeType.DUE_DATE ? (
                          <DueDateFilterComponent filter={filter} />
                        ) : filter.type === EnumCardAttributeType.LABELS ? (
                          (() => {
                            const operator = String(filter.operator);
                            const isNoValueInput =
                              operator === "any" ||
                              operator === "any_value" ||
                              operator === "no_value";
                            const isMultiSelect =
                              operator === "is_one_of" || operator === "is_not_one_of";
                            const isTextInput =
                              operator === "starts_with" ||
                              operator === "matches_with";

                            // No input needed for these operators
                            if (isNoValueInput) return null;

                            // Text input for name-based operators
                            if (isTextInput) {
                              return (
                                <Input
                                  size="small"
                                  placeholder="Enter label name"
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

                            // Use LabelSelection for dropdown-style operators
                            return (
                              <LabelSelection
                                size="small"
                                value={filter.value as string | string[]}
                                onChange={(val: string | string[]) =>
                                  handleFilterValueChange(filter.id, val)
                                }
                                mode={isMultiSelect ? "multiple" : undefined}
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
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
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

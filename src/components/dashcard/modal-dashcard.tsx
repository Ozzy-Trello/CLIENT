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
  InputNumber,
} from "antd";
import {
  Plus,
  Trash2,
  CheckSquare,
  Hash,
  List,
  StretchHorizontal,
  Calendar,
} from "lucide-react";
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
import { CustomField } from "@myTypes/custom-field";
import { UserSelection, LabelSelection, ProductSelection, BahanSelection, WarnaSelection, ProductCodeSelection } from "@components/selection";
import { useBoards } from "@hooks/board";
import { useLists } from "@hooks/list";
import { FilterOperator as DashcardFilterOperator } from "../../types/dashcard";

const { Text } = Typography;

interface ModalDashcardProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialData?: DashcardConfig | null;
  onSave: (config: DashcardConfig) => void;
}

const BOARD_LIST_OPERATORS = [
  { label: "any", value: "any" },
  { label: "on this board", value: "on_this_board" },
  { label: "is one of", value: "is_one_of" },
  { label: "is not one of", value: "is_not_one_of" },
  { label: "name starts with", value: "name_starts_with" },
  { label: "name matches", value: "name_matches" },
];

const LIST_OPERATORS = [
  { label: "any", value: "any" },
  { label: "on this list", value: "on_this_list" },
  { label: "is one of", value: "is_one_of" },
  { label: "is not one of", value: "is_not_one_of" },
  { label: "name starts with", value: "name_starts_with" },
  { label: "name matches", value: "name_matches" },
];

const normalizeOperator = (op?: string | null) =>
  op ? op.toString().trim().toLowerCase().replace(/\s+/g, "_") : undefined;

// Function to get custom field icon based on type
const getCustomFieldIcon = (type: string) => {
  switch (type) {
    case "checkbox":
      return <CheckSquare size={16} />;
    case "number":
      return <Hash size={16} />;
    case "text":
      return <StretchHorizontal size={16} />;
    case "dropdown":
      return <List size={16} />;
    case "date":
      return <Calendar size={16} />;
    default:
      return <StretchHorizontal size={16} />;
  }
};

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
    initialData?.filters || dashcardsFilter.slice(0, 3)
  );
  const [cardCount, setCardCount] = useState<number>(0);
  const [availableFilters, setAvailableFilters] = useState<DashcardFilter[]>(
    []
  );
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

  // Initialize available filters - keep all base filters available for multiple instances
  useEffect(() => {
    // Always keep base filters available to allow multiple instances
    // Only filter out custom fields that are already selected to avoid duplicates
    const selectedCustomFieldIds = selectedFilters
      .filter((filter) => filter.type === EnumCardAttributeType.CUSTOM_FIELD)
      .map((filter) => filter.id.split("_")[0]); // Get base ID without instance suffix

    const remaining = dashcardsFilter.filter((filter) => {
      // For custom fields, check if base ID is already selected
      if (filter.type === EnumCardAttributeType.CUSTOM_FIELD) {
        return !selectedCustomFieldIds.includes(filter.id);
      }
      // For other filter types, always keep them available for multiple instances
      return true;
    });

    setAvailableFilters(remaining);
  }, [selectedFilters]);

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      // console.log(initialData, "<< initial data");
      setBgColor(initialData.backgroundColor);
      setDashcardName(initialData.name);

      // Process existing filters to add proper labels and normalize values for multiple instances
      const processedFilters: DashcardFilter[] = initialData.filters.map((filter, index) => {
        const isBoard = filter.type === EnumCardAttributeType.BOARD;
        const isList = filter.type === EnumCardAttributeType.LIST;
        const operator = normalizeOperator(filter.operator as string);
        const normalizedOperator = operator as FilterOperator | undefined;
        const isMultiOp =
          operator === "is_one_of" || operator === "is_not_one_of";

        // Normalize board/list multi-select values to arrays
        const normalizedValue =
          (isBoard || isList) && isMultiOp
            ? Array.isArray(filter.value)
              ? filter.value
              : typeof filter.value === "string"
              ? filter.value.split(",").map((v) => v.trim()).filter(Boolean)
              : filter.value
              ? [String(filter.value)]
              : []
            : filter.value;

        const sameTypeFilters = initialData.filters.filter(
          (f) => f.type === filter.type
        );

        if (sameTypeFilters.length > 1) {
          // Multiple instances of the same type - add instance numbers
          const instanceIndex = sameTypeFilters.findIndex(
            (f) => f.id === filter.id
          );
          const instanceNumber = instanceIndex + 1;

          // Find the base label from dashcardsFilter
          const baseFilter = dashcardsFilter.find(
            (f) => f.type === filter.type
          );
          const baseLabel = baseFilter?.label || filter.type;

          return {
            ...filter,
            operator: normalizedOperator,
            value: normalizedValue,
            label: `${baseLabel} #${instanceNumber}`,
          };
        } else {
          // Single instance - use base label
          const baseFilter = dashcardsFilter.find(
            (f) => f.type === filter.type
          );
          return {
            ...filter,
            operator: normalizedOperator,
            value: normalizedValue,
            label: baseFilter?.label || filter.type,
          };
        }
      });

      setSelectedFilters(processedFilters);
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
      const customFieldFilters: DashcardFilter[] = customFields.map(
        (item: CustomField) => {
          let options: FilterOption[] = [];

          if (item.type === "dropdown") {
            options = [
              { label: "is one of", value: "is_one_of" },
              { label: "is not one of", value: "is_not_one_of" },
              { label: "has a value", value: "any_value" },
              { label: "has no value", value: "no_value" },
              { label: "name starts with", value: "starts_with" },
              { label: "name matches", value: "matches_with" },
            ];
          } else if (item.type === "number") {
            options = [
              { label: "not equals", value: "not_equals" },
              { label: "greater than", value: "greater_than" },
              { label: "less than", value: "less_than" },
              { label: "is between", value: "is_between" },
              { label: "has a value", value: "any_value" },
              { label: "has no value", value: "no_value" },
            ];
          } else if (item.type === "checkbox") {
            options = [
              { label: "Checked", value: "checked" },
              { label: "Unchecked", value: "unchecked" },
            ];
          } else {
            // Default for text and other types
            options = [
              { label: "not equals", value: "not_equals" },
              { label: "contains", value: "contains" },
              { label: "does not contain", value: "does_not_contain" },
              { label: "starts with", value: "starts_with" },
              { label: "ends with", value: "ends_with" },
              { label: "has a value", value: "any_value" },
              { label: "has no value", value: "no_value" },
            ];
          }

          return {
            id: item.id,
            label: item.name,
            groupType: "custom",
            type: EnumCardAttributeType.CUSTOM_FIELD,
            value: "",
            operator: "any_value" as FilterOperator,
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
    const normalizedOp = normalizeOperator(value);
    setSelectedFilters((prev) =>
      prev.map((filter) =>
        filter.id === filterId
          ? (() => {
              const currentOp = normalizeOperator(filter.operator as string);
              const next: DashcardFilter = {
                ...filter,
                operator: normalizedOp as FilterOperator,
              };

              // Normalize board/list values when switching to multi-select operators
              const isBoard = filter.type === EnumCardAttributeType.BOARD;
              const isList = filter.type === EnumCardAttributeType.LIST;
              const isMultiOp =
                normalizedOp === "is_one_of" || normalizedOp === "is_not_one_of";
              const isNoValueOp =
                normalizedOp === "on_this_board" || normalizedOp === "on_this_list";

              if ((isBoard || isList) && isMultiOp) {
                const currentVal = filter.value;
                next.value = Array.isArray(currentVal)
                  ? currentVal
                  : typeof currentVal === "string"
                  ? currentVal.split(",").map((v) => v.trim()).filter(Boolean)
                  : currentVal
                  ? [String(currentVal)]
                  : [];
              } else if ((isBoard || isList) && isNoValueOp) {
                next.value = undefined;
              } else if ((isBoard || isList) && currentOp !== normalizedOp) {
                // For other operators, ensure value is a string (single) or undefined
                const currentVal = filter.value;
                if (Array.isArray(currentVal)) {
                  next.value = currentVal[0] ?? undefined;
                }
              }

              return next;
            })()
          : filter
      )
    );
  };

  const handleFilterValueChange = (filterId: string, value: FilterValue) => {
    setSelectedFilters((prev) =>
      prev.map((filter) => {
        if (filter.id !== filterId) return filter;

        const isBoard = filter.type === EnumCardAttributeType.BOARD;
        const isList = filter.type === EnumCardAttributeType.LIST;
        const op = normalizeOperator(filter.operator as string);
        const isMulti = op === "is_one_of" || op === "is_not_one_of";

        if ((isBoard || isList) && isMulti) {
          const normalizedValue = Array.isArray(value)
            ? value
            : typeof value === "string"
            ? value.split(",").map((v) => v.trim()).filter(Boolean)
            : value
            ? [String(value)]
            : [];
          return { ...filter, value: normalizedValue } as DashcardFilter;
        }

        return { ...filter, value } as DashcardFilter;
      })
    );
  };

  const addFilter = (filterId: string) => {
    const filterTemplate = availableFilters.find((f) => f.id === filterId);
    if (filterTemplate) {
      // Create a new instance with a unique ID while preserving the original type
      const timestamp = Date.now();
      const instanceId = `${filterId}_${timestamp}`;

      // Count existing instances of this filter type for display purposes
      const existingInstances = selectedFilters.filter(
        (f) => f.type === filterTemplate.type
      ).length;
      const instanceNumber = existingInstances + 1;

      const newFilterInstance: DashcardFilter = {
        ...filterTemplate,
        id: instanceId,
        label:
          existingInstances > 0
            ? `${filterTemplate.label} #${instanceNumber}`
            : filterTemplate.label,
        // Keep the original type for backend compatibility
        type: filterTemplate.type,
        // Reset operator and value for new instance
        operator: filterTemplate.operator,
        value: undefined,
      };

      setSelectedFilters((prev) => [...prev, newFilterInstance]);

      // For custom fields, remove from available to prevent duplicates
      if (filterTemplate.type === EnumCardAttributeType.CUSTOM_FIELD) {
        setAvailableFilters((prev) => prev.filter((f) => f.id !== filterId));
      }
      // For other filter types, keep them available for additional instances
    }
  };

  const removeFilter = (filterId: string) => {
    const filterToRemove = selectedFilters.find((f) => f.id === filterId);
    if (filterToRemove) {
      setSelectedFilters((prev) => prev.filter((f) => f.id !== filterId));

      // For custom fields, add back to available if no other instances exist
      if (filterToRemove.type === EnumCardAttributeType.CUSTOM_FIELD) {
        const baseId = filterId.split("_")[0]; // Get base ID without instance suffix
        const hasOtherInstances = selectedFilters.some(
          (f) => f.id !== filterId && f.id.startsWith(baseId + "_")
        );

        if (!hasOtherInstances) {
          // Find the original filter template and add it back
          const originalFilter = dashcardsFilter.find((f) => f.id === baseId);
          if (originalFilter) {
            setAvailableFilters((prev) => [...prev, originalFilter]);
          }
        }
      }
      // For other filter types, they remain available since we always show them

      // Update instance numbers for remaining filters of the same type
      setSelectedFilters((prev) => {
        const remainingFilters = prev.filter((f) => f.id !== filterId);
        return remainingFilters.map((filter, index) => {
          if (filter.type === filterToRemove.type) {
            const sameTypeFilters = remainingFilters.filter(
              (f) => f.type === filter.type
            );
            const instanceIndex = sameTypeFilters.findIndex(
              (f) => f.id === filter.id
            );
            const instanceNumber = instanceIndex + 1;

            // Update label for multiple instances
            if (sameTypeFilters.length > 1) {
              const baseLabel =
                filter.label?.replace(/ #\d+$/, "") || filter.label;
              return {
                ...filter,
                label: `${baseLabel} #${instanceNumber}`,
              };
            } else {
              // Single instance, remove the number
              const baseLabel =
                filter.label?.replace(/ #\d+$/, "") || filter.label;
              return {
                ...filter,
                label: baseLabel,
              };
            }
          }
          return filter;
        });
      });
    }
  };

  const onFinish = () => {
    const values = form.getFieldsValue();

    // Clean selected filters to ensure proper format and maintain backend compatibility
    const cleanedFilters = selectedFilters.map((filter) => {
      // For instance filters, use the original type but keep the instance ID for uniqueness
      const baseType = filter.type;
      const operator = normalizeOperator(filter.operator as string) as
        | FilterOperator
        | undefined;

      const isBoard = filter.type === EnumCardAttributeType.BOARD;
      const isList = filter.type === EnumCardAttributeType.LIST;
      const isMulti =
        operator === "is_one_of" || operator === "is_not_one_of";

      const value =
        isBoard || isList
          ? Array.isArray(filter.value)
            ? filter.value
            : typeof filter.value === "string"
            ? filter.value.split(",").map((v) => v.trim()).filter(Boolean)
            : filter.value
            ? [String(filter.value)]
            : []
          : filter.value;

      return {
        id: filter.id, // Keep the unique instance ID
        type: baseType, // Preserve original type for backend compatibility
        operator,
        value,
      };
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

  // Due Date Filter Component
  const DueDateFilterComponent = ({ filter }: { filter: DashcardFilter }) => {
    const [number, setNumber] = useState<number>(1);
    const [unit, setUnit] = useState<string>("day");
    const [reference, setReference] = useState<string>("ago");

    const unitOptions = [
      { label: "day", value: "day" },
      { label: "week", value: "week" },
      { label: "month", value: "month" },
    ];

    const referenceOptions = [
      { label: "ago", value: "ago" },
      { label: "from now", value: "from_now" },
    ];

    // Get the selected option from the filter operator
    const selectedOption = (filter.operator as string) || "";

    useEffect(() => {
      if (filter.value && typeof filter.value === "object") {
        const value = filter.value as any;
        setNumber(value.number || 1);
        setUnit(value.unit || "day");
        setReference(value.reference || "ago");
      }
    }, [filter.value]);

    const handleComplexValueChange = (
      newNumber?: number,
      newUnit?: string,
      newReference?: string
    ) => {
      if (
        selectedOption === "later_than" ||
        selectedOption === "earlier_than"
      ) {
        handleFilterValueChange(filter.id, {
          type: selectedOption,
          number: newNumber !== undefined ? newNumber : number,
          unit: newUnit !== undefined ? newUnit : unit,
          reference: newReference !== undefined ? newReference : reference,
        } as any);
      }
    };

    const isComplexOption =
      selectedOption === "later_than" || selectedOption === "earlier_than";

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
      destroyOnHidden
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
                  {selectedFilters.map((filter) => {
                    // Determine if this is a board/list filter
                    const isBoard = filter.type === EnumCardAttributeType.BOARD;
                    const isList = filter.type === EnumCardAttributeType.LIST;
                    const operator = normalizeOperator(filter.operator as string) || "";
                    // Operator-specific input logic
                    const isMultiSelect =
                      operator === "is_one_of" || operator === "is_not_one_of";
                    const boardListValue =
                      isBoard || isList
                        ? Array.isArray(filter.value)
                          ? filter.value
                          : typeof filter.value === "string"
                          ? filter.value.split(",").map((v) => v.trim()).filter(Boolean)
                          : filter.value
                          ? [String(filter.value)]
                          : []
                        : filter.value;
                    const isTextInput =
                      operator === "name_starts_with" ||
                      operator === "name_matches";
                    const isNoValueInput =
                      operator === "on_this_board" ||
                      operator === "on_this_list";
                    return (
                      <tr
                        key={filter.id}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        <td className="py-2 pr-2 w-24">
                          <div className="flex items-center gap-2">
                            {filter.type ===
                              EnumCardAttributeType.CUSTOM_FIELD &&
                              (filter as any).field &&
                              getCustomFieldIcon((filter as any).field.type)}
                            <Text>{filter.label}</Text>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Select
                            size="small"
                            className="min-w-36 max-w-48"
                            options={
                              isBoard
                                ? BOARD_LIST_OPERATORS
                                : isList
                                ? LIST_OPERATORS
                                : filter.options
                            }
                            value={filter.operator}
                            onChange={(value) =>
                              handleFilterOperatorChange(filter.id, value)
                            }
                          />
                        </td>
                        <td className="py-2 px-2 flex-1">
                          {/* Board/List operator-specific value input */}
                          {(isBoard || isList) && isMultiSelect ? (
                          <Select
                            mode="multiple"
                            size="small"
                            className="w-full"
                            options={isBoard ? boardOptions : listOptions}
                            value={boardListValue as string[]}
                            onChange={(val) =>
                              handleFilterValueChange(filter.id, val)
                            }
                            placeholder={`Select ${
                              isBoard ? "boards" : "lists"
                            }`}
                          />
                          ) : (isBoard || isList) && isTextInput ? (
                            <Input
                              size="small"
                              placeholder={
                                operator === "name_starts_with"
                                  ? "Name starts with..."
                                  : "Exact name..."
                              }
                              value={
                                typeof filter.value === "string"
                                  ? filter.value
                                  : ""
                              }
                              onChange={(e) =>
                                handleFilterValueChange(
                                  filter.id,
                                  e.target.value
                                )
                              }
                            />
                          ) : (isBoard || isList) &&
                            isNoValueInput ? null : filter.type ===
                            EnumCardAttributeType.IS_COMPLETED ? (
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
                          ) : filter.type === EnumCardAttributeType.DUE_DATE ? (
                            <DueDateFilterComponent filter={filter} />
                          ) : filter.type === EnumCardAttributeType.LABELS ? (
                            (() => {
                              const operator = String(filter.operator);
                              const isNoValueInput =
                                operator === "any_value" ||
                                operator === "no_value";
                              const isMultiSelect =
                                operator === "is_one_of" ||
                                operator === "is_not_one_of";
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
                          ) : filter.type ===
                            EnumCardAttributeType.CUSTOM_FIELD ? (
                            (() => {
                              const field = (filter as any).field as
                                | CustomField
                                | undefined;
                              const operator = String(filter.operator);

                              // Operator-specific logic for custom fields
                              const isNoValueInput =
                                operator === "any_value" ||
                                operator === "no_value" ||
                                (field?.type === "number" &&
                                  (operator === "any_value" ||
                                    operator === "no_value")) ||
                                (field?.type === "checkbox" &&
                                  (operator === "checked" ||
                                    operator === "unchecked"));
                              const isMultiSelect =
                                operator === "is_one_of" ||
                                operator === "is_not_one_of";
                              const isTextInput =
                                operator === "starts_with" ||
                                operator === "matches_with";

                              if (!field) {
                                if (isNoValueInput) return null;
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

                              // No input needed for these operators
                              if (isNoValueInput) return null;

                              // Number field type
                              if (field.type === "number") {
                                if (operator === "is_between") {
                                  const rangeValue = (filter.value as {
                                    from: string;
                                    to: string;
                                  }) || { from: "", to: "" };
                                  return (
                                    <Space>
                                      <InputNumber
                                        size="small"
                                        placeholder="From"
                                        value={
                                          rangeValue.from
                                            ? Number(rangeValue.from)
                                            : undefined
                                        }
                                        onChange={(value) =>
                                          handleFilterValueChange(filter.id, {
                                            from: value?.toString() || "",
                                            to: rangeValue.to,
                                          })
                                        }
                                        style={{ width: 80 }}
                                      />
                                      <InputNumber
                                        size="small"
                                        placeholder="To"
                                        value={
                                          rangeValue.to
                                            ? Number(rangeValue.to)
                                            : undefined
                                        }
                                        onChange={(value) =>
                                          handleFilterValueChange(filter.id, {
                                            from: rangeValue.from,
                                            to: value?.toString() || "",
                                          })
                                        }
                                        style={{ width: 80 }}
                                      />
                                    </Space>
                                  );
                                } else {
                                  return (
                                    <InputNumber
                                      size="small"
                                      placeholder="Enter number"
                                      value={
                                        filter.value
                                          ? Number(filter.value)
                                          : undefined
                                      }
                                      onChange={(value) =>
                                        handleFilterValueChange(
                                          filter.id,
                                          value?.toString() || ""
                                        )
                                      }
                                      style={{ width: "100%" }}
                                    />
                                  );
                                }
                              }

                              // Checkbox field type - no input needed as operators handle the logic
                              if (field.type === "checkbox") {
                                return null;
                              }

                              // Text input for name-based operators
                              if (isTextInput) {
                                return (
                                  <Input
                                    size="small"
                                    placeholder="Enter text"
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
                                      mode={
                                        isMultiSelect ? "multiple" : undefined
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
                                      mode={
                                        isMultiSelect ? "multiple" : undefined
                                      }
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
                                    mode={
                                      isMultiSelect ? "multiple" : undefined
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
                          ) : filter.type === EnumCardAttributeType.PRODUCT ||
                            filter.type === EnumCardAttributeType.BAHAN ||
                            filter.type === EnumCardAttributeType.WARNA ||
                            filter.type === EnumCardAttributeType.PRODUCE_CODE ? (
                            (() => {
                              const operator = String(filter.operator);
                              const isNoValueInput =
                                operator === "any" ||
                                operator === "any_value" ||
                                operator === "no_value";
                              const isMultiSelect =
                                operator === "is_one_of" ||
                                operator === "is_not_one_of";

                              // No input needed for these operators
                              if (isNoValueInput) return null;

                              // Use selection components for all value inputs
                              if (filter.type === EnumCardAttributeType.PRODUCT) {
                                return (
                                  <ProductSelection
                                    size="small"
                                    placeholder="Select product"
                                    value={(filter.value as string) || ""}
                                    onChange={(selectedValue: string) =>
                                      handleFilterValueChange(filter.id, selectedValue)
                                    }
                                    mode={isMultiSelect ? "multiple" : undefined}
                                  />
                                );
                              }

                              if (filter.type === EnumCardAttributeType.BAHAN) {
                                return (
                                  <BahanSelection
                                    size="small"
                                    placeholder="Select bahan"
                                    value={(filter.value as string) || ""}
                                    onChange={(selectedValue: string) =>
                                      handleFilterValueChange(filter.id, selectedValue)
                                    }
                                    mode={isMultiSelect ? "multiple" : undefined}
                                  />
                                );
                              }

                              if (filter.type === EnumCardAttributeType.WARNA) {
                                return (
                                  <WarnaSelection
                                    size="small"
                                    placeholder="Select warna"
                                    value={(filter.value as string) || ""}
                                    onChange={(selectedValue: string) =>
                                      handleFilterValueChange(filter.id, selectedValue)
                                    }
                                    mode={isMultiSelect ? "multiple" : undefined}
                                  />
                                );
                              }

                              if (filter.type === EnumCardAttributeType.PRODUCE_CODE) {
                                return (
                                  <ProductCodeSelection
                                    size="small"
                                    placeholder="Select kode produk"
                                    value={(filter.value as string) || ""}
                                    onChange={(selectedValue: string) =>
                                      handleFilterValueChange(filter.id, selectedValue)
                                    }
                                    mode={isMultiSelect ? "multiple" : undefined}
                                  />
                                );
                              }

                              return null;
                            })()
                          ) : (
                            <Input
                              size="small"
                              placeholder="Type and press enter"
                              value={(filter.value as string) || ""}
                              onChange={(e) =>
                                handleFilterValueChange(
                                  filter.id,
                                  e.target.value
                                )
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
                    );
                  })}
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
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
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

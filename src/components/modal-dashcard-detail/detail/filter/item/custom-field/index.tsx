import { FC, useMemo, useEffect, useState } from "react";
import { DashcardFilter, dashcardsFilter, FilterOperator } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText, convertValueToText } from "@components/modal-dashcard-detail/util";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { Button, Input, Select, InputNumber, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { LookupCache } from "@utils/lookup-cache";
import { fetchLookups } from "@utils/fetch-lookups";
import { customFieldDetails } from "@api/custom_field";
import { userDetails } from "@api/account";
import { EnumCustomFieldType } from "@myTypes/custom-field";
import { UserSelection } from "@components/selection";
import { CheckSquare, Hash, List, StretchHorizontal, Calendar } from "lucide-react";

const CustomFieldItemFilter: FC<DashcardFilter> = ({
  operator,
  value,
  id,
  type,
  label,
}) => {
  const params = useParams();

  const {
    openEditFilter,
    handleChangeFilter,
    handleDeleteFilter,
    currentFilter,
  } = useCardDetailContext();

  const { customFields } = useCustomFields(params.workspaceId as string);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter]);

  const item = useMemo(() => {
    // Extract base ID by removing instance suffix (e.g., "_1754313090369")
    const baseId = id.split('_')[0];
    return customFields?.find((field) => field.id === baseId);
  }, [customFields, id]);

  // States for complex date filters (for value_date custom fields)
  const [number, setNumber] = useState<number>(1);
  const [unit, setUnit] = useState<string>("days");
  const [reference, setReference] = useState<string>("from now");

  // Initialize complex filter values when editing
  useEffect(() => {
    if (valueEdit?.value && typeof valueEdit.value === "object") {
      const filterValue = valueEdit.value as any;
      if (filterValue.number) setNumber(filterValue.number);
      if (filterValue.unit) setUnit(filterValue.unit);
      if (filterValue.reference) setReference(filterValue.reference);
    }
  }, [valueEdit?.value]);

  // Check if this is a date type custom field that should use due date logic
  const isDateField = useMemo(() => {
    return item?.type === EnumCustomFieldType.Date;
  }, [item]);

  // Generate operator options for different custom field types
  const operatorOptions = useMemo(() => {
    if (isDateField) {
      // Use the same options as due date filters
      return [
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
    }
    
    if (item?.type === EnumCustomFieldType.Number) {
      return [
        { label: "is between", value: FilterOperator.IS_BETWEEN },
        { label: "any value", value: FilterOperator.ANY_VALUE },
        { label: "no value", value: FilterOperator.NO_VALUE },
      ];
    }
    
    if (item?.type === EnumCustomFieldType.Checkbox) {
      return [
        { label: "Checked", value: "checked" },
        { label: "Unchecked", value: "unchecked" },
      ];
    }
    
    if (item?.type === EnumCustomFieldType.Dropdown) {
      return [
        { label: "is one of", value: FilterOperator.IS_ONE_OF },
        { label: "is not one of", value: FilterOperator.IS_NOT_ONE_OF },
        { label: "has a value", value: FilterOperator.ANY_VALUE },
        { label: "has no value", value: FilterOperator.NO_VALUE },
        { label: "name starts with", value: FilterOperator.STARTS_WITH },
        { label: "name matches", value: FilterOperator.MATCHES_WITH },
      ];
    }
    // For other types, use the default options
    return [
      { label: "has a value", value: FilterOperator.ANY_VALUE },
      { label: "has no value", value: FilterOperator.NO_VALUE },
    ];
  }, [item?.type, isDateField]);

  // Check if the current operator requires no input
  const isNoValueInput = useMemo(() => {
    const op = valueEdit?.operator;
    
    // For date fields, most operators don't require input except "later_than" and "earlier_than"
    if (isDateField) {
      return String(op) !== "later_than" && String(op) !== "earlier_than";
    }
    
    // For number fields, ANY_VALUE and NO_VALUE don't require input
    if (item?.type === EnumCustomFieldType.Number) {
      return op === FilterOperator.ANY_VALUE || op === FilterOperator.NO_VALUE;
    }
    
    // For checkbox fields, no input is needed (just checked/unchecked)
    if (item?.type === EnumCustomFieldType.Checkbox) {
      return true;
    }
    
    return op === FilterOperator.ANY_VALUE || op === FilterOperator.NO_VALUE;
  }, [valueEdit?.operator, isDateField, item?.type]);

  // Get icon based on custom field type
  const getCustomFieldIcon = (fieldType?: string) => {
    switch (fieldType) {
      case EnumCustomFieldType.Checkbox:
        return <CheckSquare size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Number:
        return <Hash size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Text:
        return <StretchHorizontal size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Dropdown:
        return <List size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Date:
        return <Calendar size={12} className="text-gray-500" />;
      default:
        return <StretchHorizontal size={12} className="text-gray-500" />;
    }
  };

  // Check if the current operator requires multi-select
  const isMultiSelect = useMemo(() => {
    const op = valueEdit?.operator;
    return op === FilterOperator.IS_ONE_OF || op === FilterOperator.IS_NOT_ONE_OF;
  }, [valueEdit?.operator]);

  // Check if the current operator requires text input
  const isTextInput = useMemo(() => {
    const op = valueEdit?.operator;
    return op === FilterOperator.STARTS_WITH || op === FilterOperator.MATCHES_WITH;
  }, [valueEdit?.operator]);

  // Check if current operator requires complex inputs (for date fields)
  const isComplexOption = useMemo(() => {
    return isDateField && (String(valueEdit?.operator) === "later_than" || String(valueEdit?.operator) === "earlier_than");
  }, [isDateField, valueEdit?.operator]);

  // Handle complex filter value changes (for date fields)
  const handleComplexValueChange = (newNumber?: number, newUnit?: string, newReference?: string) => {
    const complexValue = {
      type: "relative",
      number: newNumber ?? number,
      unit: newUnit ?? unit,
      reference: newReference ?? reference,
    };
    handleChangeFilter({ id, value: complexValue as any });
  };

  // Fetch custom field details and cache options when component mounts
  useEffect(() => {
    const baseId = id.split('_')[0];
    if (baseId && !LookupCache.label("field", baseId)) {
      fetchLookups("field", [baseId], customFieldDetails as any);
    }
  }, [id]);

  // Fetch user data for user-type custom fields
  useEffect(() => {
    if (item && value && (item.source === "user" || item.source?.startsWith("user-role:"))) {
      const userIds = Array.isArray(value) ? value : [value];
      const unknownUserIds = userIds
        .filter((userId): userId is string => typeof userId === 'string')
        .filter(userId => !LookupCache.label("user", userId));
      
      if (unknownUserIds.length > 0) {
        fetchLookups("user", unknownUserIds, userDetails as any);
      }
    }
  }, [item, value]);

  // Get the custom field name from cache or fallback to item name or label
  const customFieldName = useMemo(() => {
  // First try to get from cache using the base ID (without instance suffix)
  const baseId = id.split('_')[0];
  const cachedName = LookupCache.label("field", baseId);
  if (cachedName) return cachedName;
  
  // Fallback to item name if available
  if (item?.name) return item.name;
  
  // Last fallback to the label from filter config
  return label || baseId;
  }, [id, item?.name, label]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 font-semibold min-w-16">
            {getCustomFieldIcon(item?.type)}
            {customFieldName}
          </div>
          <div className="p-2 rounded-lg w-full">
            <Select
              options={operatorOptions}
              value={valueEdit?.operator}
              onChange={(value) => handleChangeFilter({ id, operator: value })}
              className="w-full"
            />
          </div>
          {!isNoValueInput && (
            <div className="p-2 rounded-lg">
              {(() => {
                if (!item) {
                  return (
                    <Input
                      size="small"
                      placeholder="Enter value"
                      value={(valueEdit?.value as string) || ""}
                      onChange={(e) =>
                        handleChangeFilter({ id, value: e.target.value })
                      }
                    />
                  );
                }

                // Handle text input for name-based operators
                if (isTextInput) {
                  return (
                    <Input
                      size="small"
                      placeholder="Enter text"
                      value={(valueEdit?.value as string) || ""}
                      onChange={(e) =>
                        handleChangeFilter({ id, value: e.target.value })
                      }
                    />
                  );
                }

                // Handle different custom field types
                switch (item.type) {
                  case EnumCustomFieldType.Dropdown:
                    if (item.source === "user") {
                      return (
                        <UserSelection
                          placeholder="Select user"
                          width="100%"
                          size="small"
                          onChange={(value: any) =>
                            handleChangeFilter({ id, value })
                          }
                          value={isMultiSelect ? (Array.isArray(valueEdit?.value) ? valueEdit.value : []) : (valueEdit?.value as string)}
                          mode={isMultiSelect ? "multiple" : undefined}
                        />
                      );
                    } else if (item.source?.startsWith("user-role:")) {
                      // Role-based user selection
                      const roleIds = item.source
                        .slice(10)
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      return (
                        <UserSelection
                          placeholder="Select user"
                          width="100%"
                          size="small"
                          onChange={(value: any) =>
                            handleChangeFilter({ id, value })
                          }
                          value={isMultiSelect ? (Array.isArray(valueEdit?.value) ? valueEdit.value : []) : (valueEdit?.value as string)}
                          roleIds={roleIds}
                          mode={isMultiSelect ? "multiple" : undefined}
                        />
                      );
                    }

                    // Custom dropdown
                    const opts = (item.options || []).map((o: any) => ({
                      label: o.label,
                      value: o.value,
                    }));
                    return (
                      <Select
                        size="small"
                        className="w-full"
                        options={opts}
                        value={isMultiSelect ? (Array.isArray(valueEdit?.value) ? valueEdit.value : []) : (valueEdit?.value as string)}
                        onChange={(value: string | string[]) =>
                          handleChangeFilter({ id, value })
                        }
                        placeholder="Select option"
                        mode={isMultiSelect ? "multiple" : undefined}
                      />
                    );

                case EnumCustomFieldType.Checkbox:
                  return (
                    <Select
                      size="small"
                      className="w-full"
                      options={[
                        { label: "Unchecked", value: "false" },
                        { label: "Checked", value: "true" },
                      ]}
                      value={valueEdit?.value?.toString() || "false"}
                      onChange={(value: string) =>
                        handleChangeFilter({ id, value: value === "true" })
                      }
                      placeholder="Select state"
                    />
                  );

                case EnumCustomFieldType.Number:
                  // For IS_BETWEEN operator, show two number inputs
                  if (valueEdit?.operator === FilterOperator.IS_BETWEEN) {
                    const rangeValue = (valueEdit?.value as { from?: string; to?: string }) || {};
                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          size="small"
                          type="number"
                          placeholder="From"
                          value={rangeValue.from || ""}
                          onChange={(e) => {
                            const newValue = {
                              from: e.target.value,
                              to: rangeValue.to || ""
                            };
                            handleChangeFilter({ id, value: newValue });
                          }}
                          style={{ width: 80 }}
                        />
                        <span>to</span>
                        <Input
                          size="small"
                          type="number"
                          placeholder="To (∞)"
                          value={rangeValue.to || ""}
                          onChange={(e) => {
                            const newValue = {
                              from: rangeValue.from || "",
                              to: e.target.value
                            };
                            handleChangeFilter({ id, value: newValue });
                          }}
                          style={{ width: 80 }}
                        />
                      </div>
                    );
                  }
                  
                  // For other operators, show single input (though this shouldn't be reached for ANY_VALUE/NO_VALUE)
                  return (
                    <Input
                      size="small"
                      type="number"
                      placeholder="Enter number"
                      value={(valueEdit?.value as string) || ""}
                      onChange={(e) =>
                        handleChangeFilter({ id, value: e.target.value })
                      }
                    />
                  );

                case EnumCustomFieldType.Date:
                  // For date fields with complex operators, show complex inputs
                  if (isDateField && isComplexOption) {
                    return (
                      <Space>
                        <InputNumber
                          size="small"
                          placeholder="Number"
                          value={number}
                          onChange={(value) => handleComplexValueChange(value || 0)}
                          min={0}
                          style={{ width: 80 }}
                        />
                        <Select
                          size="small"
                          value={unit}
                          onChange={(value) => handleComplexValueChange(undefined, value)}
                          style={{ width: 100 }}
                          options={[
                            { label: "days", value: "days" },
                            { label: "weeks", value: "weeks" },
                            { label: "months", value: "months" },
                            { label: "years", value: "years" },
                          ]}
                        />
                        <Select
                          size="small"
                          value={reference}
                          onChange={(value) => handleComplexValueChange(undefined, undefined, value)}
                          style={{ width: 100 }}
                          options={[
                            { label: "ago", value: "ago" },
                            { label: "from now", value: "from_now" },
                          ]}
                        />
                      </Space>
                    );
                  }
                  
                  return (
                    <Input
                      size="small"
                      type="date"
                      placeholder="Select date"
                      value={(valueEdit?.value as string) || ""}
                      onChange={(e) =>
                        handleChangeFilter({ id, value: e.target.value })
                      }
                    />
                  );

                case EnumCustomFieldType.Text:
                default:
                  return (
                    <Input
                      size="small"
                      placeholder="Enter text"
                      value={(valueEdit?.value as string) || ""}
                      onChange={(e) =>
                        handleChangeFilter({ id, value: e.target.value })
                      }
                    />
                  );
              }
            })()}
            </div>
          )}
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter(type, id)}
        />
      </div>
    );

  const displayValue = useMemo((): string => {
    if (!value) return '';
    
    // Handle IS_BETWEEN range values for number fields
    if (item?.type === EnumCustomFieldType.Number && typeof value === 'object' && value !== null && 'from' in value) {
      const rangeValue = value as { from?: string; to?: string };
      const fromText = rangeValue.from || '0';
      const toText = rangeValue.to || '∞';
      return `${fromText} to ${toText}`;
    }
    
    if (isDateField && typeof value === 'object' && value !== null) {
      return convertValueToText(value);
    }
    
    // For date fields with simple operators, the operator itself is the display value
    if (isDateField && typeof value === 'string') {
      // Convert operator values to readable text
      const dateOperatorLabels: { [key: string]: string } = {
        'today': 'today',
        'this_week': 'this week',
        'this_month': 'this month',
        'in_the_past': 'in the past',
        'in_the_future': 'in the future',
        'any_time': 'any time',
        'no_date': 'no date',
      };
      return dateOperatorLabels[value] || value;
    }
    
    if (typeof value === 'string') {
      // Check if this is a user-type custom field
      if (item?.source === "user" || item?.source?.startsWith("user-role:")) {
        // For user fields, look up the user name
        const userName = LookupCache.label("user", value);
        if (userName) return userName;
        
        // Fallback to any cache lookup for users
        const anyUserLabel = LookupCache.any(value);
        if (anyUserLabel) return anyUserLabel;
        
        // If it's a UUID-like string, show a shortened version
        if (value.length > 20 && value.includes('-')) {
          return `${value.substring(0, 8)}...`;
        }
        
        return value;
      }
      
      // For non-user fields, try to get the option label from cache
      const optionLabel = LookupCache.label("field", value);
      if (optionLabel) return optionLabel;
      
      // Fallback to any cache lookup
      const anyLabel = LookupCache.any(value);
      if (anyLabel) return anyLabel;
      
      // If it's a UUID-like string, show a shortened version
      if (value.length > 20 && value.includes('-')) {
        return `${value.substring(0, 8)}...`;
      }
      
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map(v => {
        // Check if this is a user-type custom field
        if (item?.source === "user" || item?.source?.startsWith("user-role:")) {
          // For user fields, look up the user name
          const userName = LookupCache.label("user", v);
          if (userName) return userName;
          
          // Fallback to any cache lookup for users
          const anyUserLabel = LookupCache.any(v);
          if (anyUserLabel) return anyUserLabel;
          
          // If it's a UUID-like string, show a shortened version
          if (typeof v === 'string' && v.length > 20 && v.includes('-')) {
            return `${v.substring(0, 8)}...`;
          }
          
          return String(v);
        }
        
        // For non-user fields, try to get the option label from cache
        const optionLabel = LookupCache.label("field", v);
        if (optionLabel) return optionLabel;
        
        const anyLabel = LookupCache.any(v);
        if (anyLabel) return anyLabel;
        
        if (typeof v === 'string' && v.length > 20 && v.includes('-')) {
          return `${v.substring(0, 8)}...`;
        }
        
        return String(v);
      }).join(', ');
    }
    
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    
    return String(value);
  }, [value, item?.source, item?.type, isDateField]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 font-semibold min-w-16">
        {getCustomFieldIcon(item?.type)}
        {customFieldName}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">{displayValue}</div>
    </div>
  );
};

export default CustomFieldItemFilter;

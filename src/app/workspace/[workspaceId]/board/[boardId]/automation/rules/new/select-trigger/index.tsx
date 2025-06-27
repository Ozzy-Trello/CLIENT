"use client";

import {
  CustomFieldSelection,
  FieldValueInput,
  ListSelection,
  SelectionRef,
  UserSelection,
} from "@components/selection";
import { Button, Input, Select, Typography, Popover } from "antd";
import { ListFilter, Plus, X, Calendar, List, Type } from "lucide-react";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { triggers } from "@constants/automation-rule/data";
import PopoverRuleCardFilter from "@components/popover-rule-card-filter";

import {
  AutomationRule,
  AutomationRuleTrigger,
  GeneralOptions,
  SelectedCardFilter,
  SelectedTriggerItem,
  TriggerItems,
  TriggerItemSelection,
} from "@myTypes/type";
import {
  EnumInputType,
  EnumSelectionType,
  EnumTextType,
  TriggerType,
} from "@myTypes/automation-rule";
import Item from "antd/es/list/Item";
import { EnumOptionBySubject } from "@myTypes/options";
import { EnumOptionsNumberComparisonOperators } from "@myTypes/options";
import { EnumOptionTextComparisonOperator } from "@myTypes/options";

function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>|\[([^\]]+)\]/g; // Matches both <...> and [...]
  const placeholders: string[] = [];

  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1] || match[2]);
  }
  return placeholders.filter(Boolean);
}

interface SelectTriggerProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
  triggersData: AutomationRuleTrigger[];
  setTriggersData: Dispatch<SetStateAction<AutomationRuleTrigger[]>>;
}

interface DateExpressionSelectorProps {
  groupIndex: number;
  index: number;
  placeholder: string;
  triggersData: AutomationRuleTrigger[];
  setTriggersData: React.Dispatch<
    React.SetStateAction<AutomationRuleTrigger[]>
  >;
}

interface TextComparisonSelectorProps {
  groupIndex: number;
  index: number;
  placeholder: string;
  triggersData: AutomationRuleTrigger[];
  setTriggersData: React.Dispatch<
    React.SetStateAction<AutomationRuleTrigger[]>
  >;
}

const DateExpressionSelector: React.FC<DateExpressionSelectorProps> = ({
  groupIndex,
  index,
  placeholder,
  triggersData,
  setTriggersData,
}) => {
  const itemState = triggersData[groupIndex]?.items?.[index] as any;
  const expressions = itemState?.[placeholder]?.expressions || [];

  const [open, setOpen] = useState(false);

  const [relativeState, setRelativeState] = useState({
    operator: "in",
    unit: "this week",
  });

  const [numericState, setNumericState] = useState({
    operator: "less than",
    numberVal: "1",
    unit: "days",
    direction: "from now",
  });

  const applyExpression = (type: "relative" | "numeric") => {
    let text;
    let meta;

    if (type === "relative") {
      text = `${relativeState.operator} ${relativeState.unit}`;
      meta = { ...relativeState };
    } else {
      text = `${numericState.operator} ${numericState.numberVal} ${numericState.unit} ${numericState.direction}`;
      meta = { ...numericState };
    }

    const newExpression = { text, meta };

    const copyArr = [...triggersData];
    const trgItem = copyArr[groupIndex]?.items?.[index] as any;

    if (trgItem) {
      if (!trgItem[placeholder]) {
        trgItem[placeholder] = {
          options: [],
          value: null,
          expressions: [],
        };
      }
      trgItem[placeholder].expressions = [...expressions, newExpression];
    }

    setTriggersData(copyArr);
    setOpen(false);

    // Reset states
    setRelativeState({ operator: "in", unit: "this week" });
    setNumericState({
      operator: "less than",
      numberVal: "1",
      unit: "days",
      direction: "from now",
    });
  };

  const removeExpression = (indexToRemove: number) => {
    const copyArr = [...triggersData];
    const trgItem = copyArr[groupIndex]?.items?.[index] as any;
    if (trgItem?.[placeholder]?.expressions) {
      trgItem[placeholder].expressions = expressions.filter(
        (_: unknown, i: number) => i !== indexToRemove
      );
    }
    setTriggersData(copyArr);
  };

  return (
    <div className="flex items-center gap-2">
      {expressions.map((expr: any, exprIndex: number) => (
        <span
          key={exprIndex}
          className="inline-flex items-center bg-gray-500 text-white rounded px-2 py-1 text-sm"
        >
          {expr.text}
          <X
            size={12}
            className="ml-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              removeExpression(exprIndex);
            }}
          />
        </span>
      ))}

      {expressions.length === 0 && (
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottom"
          style={{ width: "100vh" }}
          content={
            <div className="p-2 flex flex-col gap-2">
              {/* Relative period mode */}
              <div className="flex gap-2 items-center flex-nowrap whitespace-nowrap">
                <Select
                  style={{ width: 130 }}
                  value={relativeState.operator}
                  options={[
                    { value: "in", label: "in" },
                    { value: "not in", label: "not in" },
                  ]}
                  onChange={(val) =>
                    setRelativeState((prev) => ({ ...prev, operator: val }))
                  }
                />
                <Select
                  style={{ width: 120 }}
                  value={relativeState.unit}
                  options={[
                    { value: "this week", label: "this week" },
                    { value: "next week", label: "next week" },
                  ]}
                  onChange={(val) =>
                    setRelativeState((prev) => ({ ...prev, unit: val }))
                  }
                />
                <Button
                  type="text"
                  size="small"
                  onClick={() => applyExpression("relative")}
                >
                  <Plus size={12} />
                </Button>
              </div>
              <hr />

              {/* Numeric mode */}
              <div className="flex gap-2 items-center flex-nowrap whitespace-nowrap">
                <Select
                  style={{ width: 130 }}
                  value={numericState.operator}
                  options={[
                    { value: "less than", label: "less than" },
                    { value: "more than", label: "more than" },
                    { value: "between", label: "between" },
                  ]}
                  onChange={(val) =>
                    setNumericState((prev) => ({ ...prev, operator: val }))
                  }
                />
                <Input
                  style={{ width: 60 }}
                  value={numericState.numberVal}
                  type="number"
                  onChange={(e) =>
                    setNumericState((prev) => ({
                      ...prev,
                      numberVal: e.target.value,
                    }))
                  }
                />
                <Select
                  style={{ width: 120 }}
                  value={numericState.unit}
                  options={[
                    { value: "hours", label: "hours" },
                    { value: "days", label: "days" },
                    { value: "working days", label: "working days" },
                    { value: "this month", label: "this month" },
                  ]}
                  onChange={(val) =>
                    setNumericState((prev) => ({ ...prev, unit: val }))
                  }
                />
                <Select
                  style={{ width: 100 }}
                  value={numericState.direction}
                  options={[
                    { value: "from now", label: "from now" },
                    { value: "ago", label: "ago" },
                  ]}
                  onChange={(val) =>
                    setNumericState((prev) => ({ ...prev, direction: val }))
                  }
                />
                <Button
                  type="text"
                  size="small"
                  onClick={() => applyExpression("numeric")}
                >
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          }
        >
          <Button type="text" size="small" className="mx-2">
            <Calendar size={14} />
          </Button>
        </Popover>
      )}
    </div>
  );
};

const TextComparisonSelector: React.FC<TextComparisonSelectorProps> = ({
  groupIndex,
  index,
  placeholder,
  triggersData,
  setTriggersData,
}) => {
  const itemState = triggersData[groupIndex]?.items?.[index] as any;
  const expressions = itemState?.[placeholder]?.expressions || [];

  const [open, setOpen] = useState(false);

  const [operator, setOperator] = useState<string>(
    EnumOptionTextComparisonOperator.StartingWith
  );
  const [textVal, setTextVal] = useState<string>("");

  const applyExpression = () => {
    if (!textVal.trim()) return;

    const newExpr = { operator, text: textVal };

    const copyArr = [...triggersData];
    const trgItem = copyArr[groupIndex]?.items?.[index] as any;

    if (trgItem) {
      if (!trgItem[placeholder]) {
        trgItem[placeholder] = {
          options: [],
          value: null,
          expressions: [],
        };
      }
      trgItem[placeholder].expressions = [...expressions, newExpr];
    }

    setTriggersData(copyArr);
    setTextVal("");
    setOperator(EnumOptionTextComparisonOperator.StartingWith);
    setOpen(false);
  };

  const removeExpression = (idx: number) => {
    const copyArr = [...triggersData];
    const trgItem = copyArr[groupIndex]?.items?.[index] as any;
    if (trgItem?.[placeholder]?.expressions) {
      trgItem[placeholder].expressions = expressions.filter(
        (_: any, i: number) => i !== idx
      );
      setTriggersData(copyArr);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {expressions.map((expr: any, i: number) => (
        <span
          key={i}
          className="inline-flex items-center bg-gray-500 text-white rounded px-2 py-1 text-sm"
        >
          {expr.operator} "{expr.text}"
          <X
            size={12}
            className="ml-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              removeExpression(i);
            }}
          />
        </span>
      ))}

      {expressions.length === 0 && (
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottom"
          content={
            <div className="p-2 flex gap-2 items-center whitespace-nowrap">
              <Select
                style={{ width: 170 }}
                value={operator}
                options={[
                  {
                    value: EnumOptionTextComparisonOperator.StartingWith,
                    label: "starting with",
                  },
                  {
                    value: EnumOptionTextComparisonOperator.EndingWith,
                    label: "ending with",
                  },
                  {
                    value: EnumOptionTextComparisonOperator.Containing,
                    label: "containing",
                  },
                  {
                    value: EnumOptionTextComparisonOperator.NotStartingWith,
                    label: "not starting with",
                  },
                  {
                    value: EnumOptionTextComparisonOperator.NotEndingWith,
                    label: "not ending with",
                  },
                  {
                    value: EnumOptionTextComparisonOperator.NotContaining,
                    label: "not containing",
                  },
                ]}
                onChange={setOperator}
              />
              <Input
                style={{ width: 150 }}
                value={textVal}
                placeholder="text"
                onChange={(e) => setTextVal(e.target.value)}
                onPressEnter={applyExpression}
              />
              <Button type="text" size="small" onClick={applyExpression}>
                <Plus size={12} />
              </Button>
            </div>
          }
        >
          <Button type="text" size="small" className="mx-2">
            <Type size={14} />
          </Button>
        </Popover>
      )}
    </div>
  );
};

// Component for the filter button
const FilterButton = ({
  itemType,
  selectedIndex,
  props,
}: {
  itemType: string;
  selectedIndex: number;
  props: SelectTriggerProps;
}) => {
  const [openFilter, setOpenFilter] = useState(false);
  const { triggersData, setTriggersData } = props;

  const handleFilterClick = () => {
    setOpenFilter(true);
  };

  return (
    <PopoverRuleCardFilter
      key={`filter-button-${itemType}`}
      open={openFilter}
      setOpen={setOpenFilter}
      triggersData={triggersData}
      setTriggersData={setTriggersData}
      selectedIndex={selectedIndex}
      triggerEl={
        <Button
          type="text"
          size="small"
          className="mx-2"
          onClick={handleFilterClick}
        >
          <ListFilter size={14} />
        </Button>
      }
    />
  );
};

// Component for the checklist name filter button
const ChecklistFilterButton = ({
  itemType,
  selectedIndex,
  props,
}: {
  itemType: string;
  selectedIndex: number;
  props: SelectTriggerProps;
}) => {
  const { triggersData, setTriggersData } = props;

  // Only show for checklist item trigger
  if (itemType !== TriggerType.WhenChecklistItemStateChanges) {
    return null;
  }

  const checklistGroupIndex = 3; // Checklist group is at index 3
  const triggerItem = triggersData[checklistGroupIndex]?.items?.[selectedIndex];
  const hasChecklistFilter =
    triggerItem && (triggerItem as any).checklist_name !== undefined;

  const handleToggleChecklistFilter = () => {
    let copyArr = [...triggersData];
    const item = copyArr[checklistGroupIndex]?.items?.[selectedIndex] as any;
    if (item) {
      if (hasChecklistFilter) {
        delete item.checklist_name;
      } else {
        item.checklist_name = "";
      }
      setTriggersData(copyArr);
    }
  };

  const handleChecklistNameChange = (value: string) => {
    let copyArr = [...triggersData];
    const item = copyArr[checklistGroupIndex]?.items?.[selectedIndex] as any;
    if (item) {
      item.checklist_name = value;
      setTriggersData(copyArr);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="text"
        size="small"
        className="mx-2"
        onClick={handleToggleChecklistFilter}
      >
        <List size={14} />
      </Button>
      {hasChecklistFilter && (
        <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
          <span className="text-sm">in a checklist named</span>
          <Input
            size="small"
            style={{ width: "120px" }}
            placeholder="Checklist name"
            value={(triggerItem as any)?.checklist_name || ""}
            onChange={(e) => handleChecklistNameChange(e.target.value)}
          />
          <Button
            type="text"
            size="small"
            onClick={handleToggleChecklistFilter}
          >
            <X size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};

const SelectOption = ({
  props,
  placeholder,
  data,
  itemType,
  groupIndex,
  index,
}: {
  props: SelectTriggerProps;
  placeholder: string;
  data: TriggerItemSelection;
  itemType: string;
  groupIndex: number;
  index: number;
}) => {
  const { setTriggersData, triggersData } = props;

  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));

  const onSelectionChange = (selectedAntOption: {
    value: string;
    label: React.ReactNode;
    option: GeneralOptions;
  }) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = selectedAntOption.option;
    setTriggersData(copyArr);
  };

  // Callback for ListSelection's onChange
  const onListChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = selectedOption;
    setTriggersData(copyArr);
  };

  const onUserChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    ).data = [selectedOption.value];
    setTriggersData(copyArr);
  };

  const onCustomFieldChange = (selectedOption: GeneralOptions) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = selectedOption;

    setTriggersData(copyArr);
  };

  const onFieldValueChange = (value: string) => {
    let copyArr = [...triggersData];
    (
      copyArr[groupIndex]?.items?.[index]?.[
        placeholder as keyof TriggerItems
      ] as any
    )["value"] = value;
    setTriggersData(copyArr);
  };

  if (placeholder === EnumSelectionType.Fields) {
    const currentValue =
      (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
        ?.value || "";

    return (
      <div>
        <CustomFieldSelection
          key={`custom-field-select-${itemType}-${placeholder}`}
          width={"fit-content"}
          ref={useRef<SelectionRef>(null)}
          value={currentValue}
          onChange={(value: string, option: GeneralOptions) => {
            onCustomFieldChange(option);
          }}
          className="mx-2"
          filterTypes={(data as any)?.fieldTypeFilter}
        />
      </div>
    );
  }

  if (placeholder === EnumInputType.FieldValue) {
    const field = triggersData.find(
      (item) => item.label.toLowerCase() === EnumSelectionType.Fields
      // @ts-ignore
    )?.items?.[2]?.fields?.value as any;
    return (
      <FieldValueInput
        key={`field-value-input-${itemType}-${placeholder}`}
        width={"fit-content"}
        ref={useRef<SelectionRef>(null)}
        field={field}
        onChange={(value: string) => {
          onFieldValueChange(value);
        }}
        className="mx-2"
      />
    );
  }

  if (
    placeholder === EnumSelectionType.List ||
    placeholder === EnumSelectionType.OptionalList
  ) {
    return (
      <span className="mx-2">
        <ListSelection
          key={`list-select-${itemType}-${placeholder}`}
          width={"fit-content"}
          ref={useRef<SelectionRef>(null)}
          value={
            (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]
              ?.value?.value || ""
          }
          onChange={(value: string, option: GeneralOptions) => {
            onListChange(option);
          }}
          className="mr-2 ml-2"
        />
      </span>
    );
  }

  if (placeholder === EnumSelectionType.DateExpression) {
    return (
      <DateExpressionSelector
        groupIndex={groupIndex}
        index={index}
        placeholder={placeholder}
        triggersData={triggersData}
        setTriggersData={setTriggersData}
      />
    );
  }

  if (placeholder === EnumSelectionType.TextComparison) {
    return (
      <TextComparisonSelector
        groupIndex={groupIndex}
        index={index}
        placeholder={placeholder}
        triggersData={triggersData}
        setTriggersData={setTriggersData}
      />
    );
  }

  return (
    <>
      <Select
        key={`ant-select-${itemType}-${placeholder}`}
        value={
          (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]
            ?.value?.value || ""
        }
        options={options}
        style={{ width: 120, margin: "0 5px" }}
        onChange={(value, option) => {
          onSelectionChange(
            option as {
              value: string;
              label: React.ReactNode;
              option: GeneralOptions;
            }
          );
        }}
      />

      {(placeholder == EnumSelectionType.OptionalBySubject ||
        placeholder == EnumSelectionType.BySubject) &&
        [
          EnumOptionBySubject.BySpecificUser,
          EnumOptionBySubject.ByAnyoneExceptSpecificUser,
        ].includes(
          (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]
            ?.value?.value
        ) && (
          <UserSelection
            key={`user-select-${itemType}-${placeholder}`}
            width={"fit-content"}
            ref={useRef<SelectionRef>(null)}
            onChange={(value: string, option: GeneralOptions) => {
              onUserChange(option);
            }}
            className="mx-2"
          />
        )}
    </>
  );
};

const LabelRenderer = ({
  props,
  item,
  groupIndex,
  index,
}: {
  props: SelectTriggerProps;
  item: TriggerItems;
  groupIndex: number;
  index: number;
}) => {
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<") && !item.label.includes("[")) {
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  const parts = item.label.split(/(<[^>]+>|\[[^\]]+\])/g);

  return (
    <div className="flex items-center flex-wrap gap-3">
      {parts.map((part: string) => {
        const trimmedPart = part.trim();

        if (trimmedPart.startsWith("<") && trimmedPart.endsWith(">")) {
          const placeholder = trimmedPart.slice(1, -1); // Remove < and >

          if (
            Object.values(EnumSelectionType).includes(
              placeholder as EnumSelectionType
            )
          ) {
            // Check if the item actually defines data for this placeholder
            if (
              placeholder in item &&
              item[placeholder] &&
              typeof item[placeholder] === "object" &&
              "options" in (item[placeholder] as TriggerItemSelection)
            ) {
              const data = item[placeholder] as TriggerItemSelection;
              return (
                <SelectOption
                  key={`select-option-${item.type}-${placeholder}-${groupIndex}-${index}`}
                  props={props}
                  placeholder={placeholder}
                  data={data}
                  itemType={item.type}
                  groupIndex={groupIndex}
                  index={index}
                />
              );
            }

            if (placeholder === "filter") {
              return (
                <div
                  key={`filter-buttons-${item.type}-${index}`}
                  className="flex items-center gap-1"
                >
                  <FilterButton
                    itemType={item.type}
                    selectedIndex={index}
                    props={props}
                  />
                  <ChecklistFilterButton
                    itemType={item.type}
                    selectedIndex={index}
                    props={props}
                  />
                </div>
              );
            }
          }
        }

        if (trimmedPart.startsWith("[") && trimmedPart.endsWith("]")) {
          const placeholder = trimmedPart.slice(1, -1);

          // Special handling for numeric comparison with additional range
          if (placeholder === EnumInputType.Number) {
            const itemState = props.triggersData[groupIndex]?.items?.[
              index
            ] as any;
            const mainValue = itemState?.[placeholder] || "";

            const handleMainValueChange = (val: string) => {
              let copyArr = [...props.triggersData];
              const itemRef = copyArr[groupIndex]?.items?.[index] as any;
              if (itemRef) {
                itemRef[placeholder] = val;
                props.setTriggersData(copyArr);
              }
            };

            const handleAddRange = () => {
              let copyArr = [...props.triggersData];
              const itemRef = copyArr[groupIndex]?.items?.[index] as any;
              if (itemRef && !itemRef.additionalComparison) {
                itemRef.additionalComparison = {
                  operator: EnumOptionsNumberComparisonOperators.FewerThan,
                  value: "",
                };
                props.setTriggersData(copyArr);
              }
            };

            const handleRemoveRange = () => {
              let copyArr = [...props.triggersData];
              const itemRef = copyArr[groupIndex]?.items?.[index] as any;
              if (itemRef) {
                delete itemRef.additionalComparison;
              }
              props.setTriggersData(copyArr);
            };

            const handleOperatorChange = (value: string) => {
              let copyArr = [...props.triggersData];
              const itemRef = copyArr[groupIndex]?.items?.[index] as any;
              if (itemRef?.additionalComparison) {
                itemRef.additionalComparison.operator = value;
              }
              props.setTriggersData(copyArr);
            };

            const handleSecondValueChange = (val: string) => {
              let copyArr = [...props.triggersData];
              const itemRef = copyArr[groupIndex]?.items?.[index] as any;
              if (itemRef?.additionalComparison) {
                itemRef.additionalComparison.value = val;
              }
              props.setTriggersData(copyArr);
            };

            return (
              <span
                key={`input-${item.type}-${placeholder}-${index}`}
                className="flex items-center gap-2"
              >
                <Input
                  style={{ width: "70px" }}
                  value={mainValue}
                  type="number"
                  onChange={(e) => handleMainValueChange(e.target.value)}
                />
                {itemState?.additionalComparison ? (
                  <>
                    <Typography.Text className="mx-1">and</Typography.Text>
                    <Select
                      style={{ width: 150 }}
                      value={itemState.additionalComparison?.operator}
                      onChange={handleOperatorChange}
                      options={[
                        {
                          value: EnumOptionsNumberComparisonOperators.MoreThan,
                          label: "greater than",
                        },
                        {
                          value:
                            EnumOptionsNumberComparisonOperators.MoreOrEqual,
                          label: "greater or equal to",
                        },
                        {
                          value: EnumOptionsNumberComparisonOperators.FewerThan,
                          label: "lower than",
                        },
                        {
                          value:
                            EnumOptionsNumberComparisonOperators.FewerOrEqual,
                          label: "lower or equal to",
                        },
                      ]}
                    />
                    <Input
                      style={{ width: "70px" }}
                      value={itemState.additionalComparison?.value}
                      type="number"
                      onChange={(e) => handleSecondValueChange(e.target.value)}
                    />
                    <Button
                      size="small"
                      type="text"
                      onClick={handleRemoveRange}
                    >
                      <X size={12} />
                    </Button>
                  </>
                ) : (
                  <Button size="small" type="text" onClick={handleAddRange}>
                    <Plus size={12} />
                  </Button>
                )}
              </span>
            );
          }

          // Hide name input based on trigger type and scope
          if (placeholder === EnumInputType.Text) {
            // For checklist completion trigger
            if (item.type === TriggerType.WhenChecklistCompletionChanges) {
              const scopeObj = (
                props.triggersData[groupIndex]?.items?.[index] as any
              )?.[EnumSelectionType.ChecklistScope];
              let scopeVal: any = scopeObj;
              if (scopeVal && typeof scopeVal === "object") {
                scopeVal = "value" in scopeVal ? scopeVal.value : scopeVal;
                if (
                  scopeVal &&
                  typeof scopeVal === "object" &&
                  "value" in scopeVal
                ) {
                  scopeVal = scopeVal.value;
                }
              }
              if (scopeVal && scopeVal !== "checklist") {
                return null; // Skip rendering the text input
              }
            }

            // For checklist item state trigger
            if (item.type === TriggerType.WhenChecklistItemStateChanges) {
              const scopeObj = (
                props.triggersData[groupIndex]?.items?.[index] as any
              )?.[EnumSelectionType.ItemScope];
              let scopeVal: any = scopeObj;
              if (scopeVal && typeof scopeVal === "object") {
                scopeVal = "value" in scopeVal ? scopeVal.value : scopeVal;
                if (
                  scopeVal &&
                  typeof scopeVal === "object" &&
                  "value" in scopeVal
                ) {
                  scopeVal = scopeVal.value;
                }
              }
              if (scopeVal && scopeVal !== "the") {
                return null; // Skip rendering the text input
              }
            }

            // For checklist item added/removed trigger
            if (item.type === TriggerType.WhenChecklistItemIsAddedTo) {
              const scopeObj = (
                props.triggersData[groupIndex]?.items?.[index] as any
              )?.[EnumSelectionType.ChecklistScope];
              let scopeVal: any = scopeObj;
              if (scopeVal && typeof scopeVal === "object") {
                scopeVal = "value" in scopeVal ? scopeVal.value : scopeVal;
                if (
                  scopeVal &&
                  typeof scopeVal === "object" &&
                  "value" in scopeVal
                ) {
                  scopeVal = scopeVal.value;
                }
              }
              if (scopeVal && scopeVal !== "checklist") {
                return null; // Skip rendering the text input
              }
            }
          }

          // Conditional text input behaviour
          const inputValue =
            (props.triggersData[groupIndex]?.items?.[index] as any)?.[
              placeholder
            ] || "";

          return (
            <Input
              style={{ width: "fit-content" }}
              key={`input-${item.type}-${placeholder}-${index}`}
              placeholder={placeholder}
              value={inputValue}
              type={placeholder === EnumInputType.Number ? "number" : "text"}
              onChange={(e) => {
                let copyArr = [...props.triggersData];
                if (copyArr[groupIndex]?.items?.[index]) {
                  copyArr[groupIndex].items[index][placeholder] =
                    e.target.value;
                }
                props.setTriggersData(copyArr);
              }}
            />
          );
        }

        // Regular text part
        if (
          item.type === TriggerType.WhenChecklistCompletionChanges &&
          trimmedPart === "is"
        ) {
          const scopeObj = (
            props.triggersData[groupIndex]?.items?.[index] as any
          )?.[EnumSelectionType.ChecklistScope];
          let scopeVal: any = scopeObj;
          if (scopeVal && typeof scopeVal === "object") {
            scopeVal = "value" in scopeVal ? scopeVal.value : scopeVal;
            if (
              scopeVal &&
              typeof scopeVal === "object" &&
              "value" in scopeVal
            ) {
              scopeVal = scopeVal.value;
            }
          }
          if (scopeVal === "all-checklists") {
            return "are";
          }
        }
        return part;
      })}
    </div>
  );
};

const SelectTrigger: React.FC<SelectTriggerProps> = (props) => {
  const { setSelectedRule, selectedRule, triggersData, nextStep } = props;
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  // Callback for when a specific trigger item's '+' button is clicked
  const onSelectTrigger = useCallback(
    (selectedItem: TriggerItems, index: number) => {
      const placeholders = extractPlaceholders(selectedItem.label);

      // Initialize newTriggerItem based on the selectedItem's defaults
      const newTriggerItem: SelectedTriggerItem = {
        type: selectedItem.type,
        label: selectedItem.label,
      };

      placeholders?.forEach((placeholder) => {
        // Handle GeneralOptions-based selections (e.g., <list>, <optionalList>)
        const items = triggersData[selectedGroupIndex]?.items;

        if (items && items[index] && items[index][placeholder]) {
          if (
            placeholder === EnumSelectionType.DateExpression ||
            placeholder === EnumSelectionType.TextComparison
          ) {
            newTriggerItem[placeholder] =
              (items[index][placeholder] as any)?.expressions || [];
            return;
          }

          if (typeof items[index][placeholder] == "object") {
            newTriggerItem[placeholder] = (
              items[index][placeholder] as any
            )?.value;
            if ("data" in (items[index][placeholder] as any)) {
              (newTriggerItem[placeholder] as any)["data"] = (
                items[index][placeholder] as any
              ).data;
            }
          } else {
            newTriggerItem[placeholder] = items[index][placeholder];
          }
        }
      });

      // Include additional numeric comparison if present
      const currentItem = triggersData[selectedGroupIndex]?.items?.[
        index
      ] as any;
      if (currentItem?.additionalComparison) {
        (newTriggerItem as any).additionalComparison =
          currentItem.additionalComparison;
      }

      // After placeholder processing
      // Include constant action if present but not in placeholders
      const itemWithData = triggersData[selectedGroupIndex]?.items?.[
        index
      ] as any;
      if (
        itemWithData?.[EnumSelectionType.Action] &&
        !newTriggerItem[EnumSelectionType.Action]
      ) {
        newTriggerItem[EnumSelectionType.Action] = (
          itemWithData[EnumSelectionType.Action] as any
        )?.value;
      }

      // Include checklist_name if present
      if (itemWithData?.checklist_name) {
        (newTriggerItem as any).checklist_name = itemWithData.checklist_name;
      }

      setSelectedRule((prev: AutomationRule) => ({
        ...prev,
        triggerItem: newTriggerItem,
        triggerType: triggersData[selectedGroupIndex]?.type,
      }));

      nextStep();
    },
    [selectedRule.triggerItem, nextStep, setSelectedRule, selectedGroupIndex]
  );

  return (
    <div>
      <Typography.Title level={5}>Select Trigger</Typography.Title>
      <div className="flex gap-2 my-4">
        {triggersData.map((item, index) => (
          <div
            key={item.type}
            onClick={() => {
              setSelectedGroupIndex(index);
            }}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedGroupIndex === index ? "bg-blue-100" : "bg-gray-300"
            }`}
          >
            <div>{item.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>
      <div>
        {triggersData[selectedGroupIndex]?.items?.map(
          (item: TriggerItems, index: number) => (
            <div
              key={item.type}
              className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200"
            >
              <div>
                <LabelRenderer
                  props={props}
                  item={item}
                  groupIndex={selectedGroupIndex}
                  index={index}
                />
              </div>
              <Button
                shape="circle"
                onClick={() => {
                  onSelectTrigger(item, index);
                }}
              >
                <Plus />
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SelectTrigger;

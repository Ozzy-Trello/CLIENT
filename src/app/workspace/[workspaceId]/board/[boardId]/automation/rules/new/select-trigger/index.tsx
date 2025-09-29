"use client";

import {
  CustomFieldSelection,
  FieldValueInput,
  LabelSelection,
  ListSelection,
  SelectionRef,
  UserSelection,
  RoleSelection,
  MultiFieldValueInput,
} from "@components/selection";
import { Button, Input, Select, Typography, Popover, Tag } from "antd";
import { ListFilter, Plus, X, Calendar, List, Type, Check } from "lucide-react";
import React, {
  Dispatch,
  SetStateAction,
  useRef,
  useState,
  useCallback,
} from "react";
import PopoverRuleCardFilter from "@components/popover-rule-card-filter";

import {
  AutomationRule,
  AutomationRuleTrigger,
  GeneralOptions,
  SelectedCardFilterItem,
  SelectedTriggerItem,
  TriggerItems,
  TriggerItemSelection,
} from "@myTypes/type";
import {
  EnumInputType,
  EnumSelectionType,
  EnumTextType,
  TriggerGroupType,
  TriggerType,
} from "@myTypes/automation-rule";
import { EnumOptionBySubject } from "@myTypes/options";
import { EnumOptionsNumberComparisonOperators } from "@myTypes/options";
import { EnumOptionTextComparisonOperator } from "@myTypes/options";
import { renderType } from "@utils/automation-rule";

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
  isEditMode?: boolean;
  onSaveAndClose?: (updatedRule: AutomationRule) => Promise<void>;
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
          className="inline-flex items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          {expr.text}
          <X
            size={14}
            className="ml-2 cursor-pointer hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition-all duration-200"
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
            <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="space-y-4">
                {/* Relative period mode */}
                <div className="space-y-2">
                  <Typography.Text className="text-sm font-medium text-gray-700">Relative Period</Typography.Text>
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
                      className="hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                </div>
                <hr className="border-gray-200" />

                {/* Numeric mode */}
                <div className="space-y-2">
                  <Typography.Text className="text-sm font-medium text-gray-700">Numeric Period</Typography.Text>
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
                      className="hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <Button 
            type="text" 
            size="small" 
            className="mx-2 hover:bg-blue-50 rounded-lg transition-colors duration-200"
          >
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
          className="inline-flex items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
        >
          {expr.operator} "{expr.text}"
          <X
            size={14}
            className="ml-2 cursor-pointer hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition-all duration-200"
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
            <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
              <div className="space-y-3">
                <Typography.Text className="text-sm font-medium text-gray-700">Text Comparison</Typography.Text>
                <div className="flex gap-2 items-center whitespace-nowrap">
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
                    placeholder="Enter text..."
                    onChange={(e) => setTextVal(e.target.value)}
                    onPressEnter={applyExpression}
                  />
                  <Button 
                    type="text" 
                    size="small" 
                    onClick={applyExpression}
                    className="hover:bg-green-50 rounded-lg transition-colors duration-200"
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              </div>
            </div>
          }
        >
          <Button 
            type="text" 
            size="small" 
            className="mx-2 hover:bg-green-50 rounded-lg transition-colors duration-200"
          >
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
  selectedGroupIndex,
  selectedIndex,
  props,
}: {
  itemType: string;
  selectedGroupIndex: number;
  selectedIndex: number;
  props: SelectTriggerProps;
}) => {
  const [openFilter, setOpenFilter] = useState(false);
  const { triggersData, setTriggersData } = props;

  const handleFilterClick = () => {
    setOpenFilter(!openFilter);
  };

  const removeFilterItem = (filterIndex: number) => {
    let copyTrigger = [...triggersData];
    let copyFilters =
      copyTrigger?.[selectedGroupIndex]?.items?.[selectedIndex]?.filters;

    if (copyFilters) {
      copyFilters.splice(filterIndex, 1);
    }
    if (
      copyTrigger[selectedGroupIndex].items &&
      copyTrigger[selectedGroupIndex].items[selectedIndex]
    ) {
      copyTrigger[selectedGroupIndex].items[selectedIndex].filters =
        copyFilters;
    }

    setTriggersData(copyTrigger);
  };

  return (
    <>
      {props?.triggersData?.[selectedGroupIndex]?.items?.[
        selectedIndex
      ].filters?.map((filterItem, filterIndex) => {
        const s = renderType(filterItem.type, filterItem);
        console.log("s: ", s);
        return (
          <Tag
            closeIcon={<X size={12} className="inline" />}
            onClose={() => removeFilterItem(filterIndex)}
          >
            {s}
          </Tag>
        );
      })}
      <PopoverRuleCardFilter
        key={`filter-button-${itemType}`}
        open={openFilter}
        setOpen={setOpenFilter}
        triggersData={triggersData}
        setTriggersData={setTriggersData}
        selectedIndex={selectedIndex}
        selectedGroupIndex={selectedGroupIndex}
        triggerEl={
          <Button
            type="text"
            size="small"
            className="mx-2 hover:bg-purple-50 rounded-lg transition-colors duration-200"
            onClick={handleFilterClick}
          >
            <ListFilter size={14} />
          </Button>
        }
      />
    </>
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
    triggerItem &&
    (triggerItem as any)[EnumSelectionType.ChecklistName] !== undefined;

  const handleToggleChecklistFilter = () => {
    let copyArr = [...triggersData];
    const item = copyArr[checklistGroupIndex]?.items?.[selectedIndex] as any;
    if (item) {
      if (hasChecklistFilter) {
        delete item[EnumSelectionType.ChecklistName];
      } else {
        item[EnumSelectionType.ChecklistName] = "";
      }
      setTriggersData(copyArr);
    }
  };

  const handleChecklistNameChange = (value: string) => {
    let copyArr = [...triggersData];
    const item = copyArr[checklistGroupIndex]?.items?.[selectedIndex] as any;
    if (item) {
      item[EnumSelectionType.ChecklistName] = value;
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
            value={
              (triggerItem as any)?.[EnumSelectionType.ChecklistName] || ""
            }
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

  const onRoleChange = (selectedOption: GeneralOptions | GeneralOptions[]) => {
    let copyArr = [...triggersData];
    // Handle both single and multiple selection
    if (Array.isArray(selectedOption)) {
      // Multiple selection - store array of role IDs
      (
        copyArr[groupIndex]?.items?.[index]?.[
          placeholder as keyof TriggerItems
        ] as any
      ).data = selectedOption.map((option) => option.value);
    } else {
      // Single selection - store single role ID
      (
        copyArr[groupIndex]?.items?.[index]?.[
          placeholder as keyof TriggerItems
        ] as any
      ).data = [selectedOption.value];
    }
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

  if (placeholder === EnumSelectionType.MultiLists) {
    return (
      <span className="mx-2">
        <ListSelection
          key={`multi-list-select-${itemType}-${placeholder}`}
          width={"fit-content"}
          ref={useRef<SelectionRef>(null)}
          mode="multiple"
          value={
            (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]
              ?.value || []
          }
          onChange={(
            value: string | string[],
            option: GeneralOptions | GeneralOptions[]
          ) => {
            let copyArr = [...triggersData];
            if (Array.isArray(option)) {
              // Multiple selection - store array of options
              (
                copyArr[groupIndex]?.items?.[index]?.[
                  placeholder as keyof TriggerItems
                ] as any
              )["value"] = option;
            } else {
              // Single selection - wrap in array for consistency
              (
                copyArr[groupIndex]?.items?.[index]?.[
                  placeholder as keyof TriggerItems
                ] as any
              )["value"] = [option];
            }
            setTriggersData(copyArr);
          }}
          className="mr-2 ml-2"
        />
      </span>
    );
  }

  if (placeholder === EnumSelectionType.CardLabel) {
    return (
      <span
        className="mx-2"
        key={`card-label-select-${itemType}-${placeholder}`}
      >
        <LabelSelection
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
        style={{
          width:
            placeholder === EnumSelectionType.OptionalBySubject ? 260 : 120,
          margin: "0 5px",
        }}
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

      {(placeholder == EnumSelectionType.OptionalBySubject ||
        placeholder == EnumSelectionType.BySubject) &&
        [EnumOptionBySubject.ByRole].includes(
          (triggersData[groupIndex]?.items?.[index] as any)?.[placeholder]
            ?.value?.value
        ) && (
          <RoleSelection
            key={`role-select-${itemType}-${placeholder}`}
            width={"fit-content"}
            ref={useRef<SelectionRef>(null)}
            mode="multiple"
            onChange={(
              value: string | string[],
              option: GeneralOptions | GeneralOptions[]
            ) => {
              onRoleChange(option);
            }}
            className="mx-2"
            placeholder="Select roles"
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
                    key={`filter-button-${item.type}-${index}`}
                    itemType={item.type}
                    selectedGroupIndex={groupIndex}
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

          // Handle EnumInputType values like FieldValue and MultiFieldValue
          if (
            Object.values(EnumInputType).includes(placeholder as EnumInputType)
          ) {
            // Handle EnumInputType.MultiFieldValue specially for multi-select
            if (placeholder === EnumInputType.MultiFieldValue) {
              // Get the selected custom field from the current item's fields property
              const field = (
                props.triggersData[groupIndex]?.items?.[index] as any
              )?.[EnumSelectionType.Fields]?.value as any;

              return (
                <MultiFieldValueInput
                  key={`multi-field-value-input-${item.type}-${placeholder}-${groupIndex}-${index}`}
                  width={"fit-content"}
                  ref={useRef<SelectionRef>(null)}
                  field={field}
                  value={
                    (props.triggersData[groupIndex]?.items?.[index] as any)?.[
                      placeholder
                    ] || []
                  }
                  onChange={(values: string[]) => {
                    let copyArr = [...props.triggersData];
                    (copyArr[groupIndex]?.items?.[index] as any)[placeholder] =
                      values;
                    props.setTriggersData(copyArr);
                  }}
                  className="mx-2"
                />
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
  const { setSelectedRule, selectedRule, triggersData, nextStep, isEditMode = false, onSaveAndClose } = props;
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [configuringTriggerIndex, setConfiguringTriggerIndex] = useState<
    number | null
  >(null);
  [[[]]];
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
      // handle the filter
      if (selectedItem?.filters) {
        let filtersArr: SelectedCardFilterItem[] = [];

        selectedItem?.filters?.map((filterItem, filterIndex) => {
          const placeholders = extractPlaceholders(filterItem.label);
          if (!placeholders.includes(EnumInputType.Text))
            placeholders.push(EnumInputType.Text);
          if (!placeholders.includes(EnumSelectionType.Completion))
            placeholders.push(EnumSelectionType.Completion);

          // Initialize newTriggerItem based on the selectedItem's defaults
          const newFilterItem: SelectedCardFilterItem = {
            type: filterItem.type,
            label: filterItem.label,
          };

          placeholders?.forEach((placeholder) => {
            if (filterItem && filterItem[placeholder]) {
              if (typeof filterItem[placeholder] == "object") {
                newFilterItem[placeholder] = (
                  filterItem[placeholder] as any
                )?.value;
                if ("data" in (filterItem[placeholder] as any)) {
                  (newFilterItem[placeholder] as any)["data"] = (
                    filterItem[placeholder] as any
                  ).data;
                }
              } else {
                newFilterItem[placeholder] = filterItem[placeholder];
              }
            }
          });

          filtersArr.push(newFilterItem);
        });

        newTriggerItem.filter = filtersArr;
      }

      if (selectedItem.type === TriggerType.WhenCardContentTextIsSet) {
        (newTriggerItem.action as any) = {
          value: TriggerGroupType.CardContent,
          label: "Card Content",
        };
      }

      if (selectedItem.type === TriggerType.WhenTaskDateIsSet) {
        (newTriggerItem.action as any) = {
          value: TriggerGroupType.CardDates,
          label: "Card Dates",
        };
      }

      const updatedRule = {
        ...selectedRule,
        triggerItem: newTriggerItem,
        triggerType: triggersData[selectedGroupIndex]?.type,
      };

      setSelectedRule(updatedRule);

      // In create mode, go directly to next step. In edit mode, auto-save immediately
      if (!isEditMode) {
        nextStep();
      } else {
        // Auto-save immediately in edit mode
        if (onSaveAndClose) {
          onSaveAndClose(updatedRule);
        }
      }
    },
    [selectedRule, nextStep, setSelectedRule, selectedGroupIndex, isEditMode, onSaveAndClose, triggersData]
  );

  const onSaveTrigger = useCallback(async () => {
    setConfiguringTriggerIndex(null);
    if (isEditMode && onSaveAndClose) {
      await onSaveAndClose(selectedRule);
    } else {
      nextStep();
    }
  }, [nextStep, isEditMode, onSaveAndClose, selectedRule]);

  const onCancelTrigger = useCallback(() => {
    setConfiguringTriggerIndex(null);
    setSelectedRule((prev: AutomationRule) => ({
      ...prev,
      triggerItem: undefined,
      triggerType: "",
    }));
  }, [setSelectedRule]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Typography.Title level={4} className="text-gray-800 font-semibold">
              Select Trigger
            </Typography.Title>
            <Typography.Text className="text-gray-600">
              Choose the event that will start your automation
            </Typography.Text>
          </div>
          {isEditMode && (
            <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
              Edit Mode
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {triggersData.map((item, index) => (
          <div
            key={item.type}
            onClick={() => {
              setSelectedGroupIndex(index);
            }}
            className={`group relative overflow-hidden rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedGroupIndex === index 
                ? "bg-white border-2 border-blue-400 shadow-sm" 
                : "bg-white border border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className={`p-2 rounded-lg transition-colors duration-200 ${
                selectedGroupIndex === index 
                  ? "bg-blue-50 text-blue-600" 
                  : "bg-gray-50 text-gray-600 group-hover:bg-gray-100"
              }`}>
                {item.icon}
              </div>
              <Typography.Text className={`text-sm font-medium text-center transition-colors duration-200 ${
                selectedGroupIndex === index 
                  ? "text-blue-700" 
                  : "text-gray-700 group-hover:text-gray-800"
              }`}>
                {item.label}
              </Typography.Text>
            </div>
            {selectedGroupIndex === index && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="space-y-3">
        {triggersData[selectedGroupIndex]?.items?.map(
          (item: TriggerItems, index: number) => (
            <div
              key={item.type}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                configuringTriggerIndex === index
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start p-6">
                <div className="flex-1 min-w-0">
                  <LabelRenderer
                    props={props}
                    item={item}
                    groupIndex={selectedGroupIndex}
                    index={index}
                  />
                </div>
                <div className="flex gap-2 ml-4">
                  {configuringTriggerIndex === index ? (
                    <>
                      <Button
                        shape="circle"
                        onClick={onSaveTrigger}
                        className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all duration-200"
                        size="large"
                      >
                        <Check className="text-white w-4 h-4" />
                      </Button>
                      <Button
                        shape="circle"
                        onClick={onCancelTrigger}
                        className="bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 shadow-sm hover:shadow-md transition-all duration-200"
                        size="large"
                      >
                        <X className="text-white w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      shape="circle"
                      onClick={() => {
                        onSelectTrigger(item, index);
                      }}
                      disabled={configuringTriggerIndex !== null}
                      className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600 text-white shadow-sm hover:shadow-md transition-all duration-200 disabled:bg-gray-300 disabled:border-gray-300"
                      size="large"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              {configuringTriggerIndex === index && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SelectTrigger;

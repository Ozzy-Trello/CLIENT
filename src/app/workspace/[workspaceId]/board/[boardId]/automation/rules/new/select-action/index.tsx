"use client";
import { Button, Input, Select, Typography, Popover } from "antd";
import { actions } from "@constants/automation-rule/data";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Plus, Calendar, X } from "lucide-react";
import {
  ActionItems,
  AutomationRule,
  AutomationRuleAction,
  AutomationRuleTrigger,
  GeneralOptions,
  SelectedAction,
  SelectedActionItem,
  TriggerItemSelection,
} from "@myTypes/type";
import {
  ListSelection,
  SelectionRef,
  CustomFieldSelection,
  UserSelection,
  FieldValueInput,
  BoardSelection,
  LabelSelection,
} from "@components/selection";
import { EnumSelectionType, EnumTextType } from "@myTypes/automation-rule";
import { EnumInputType } from "@myTypes/automation-rule";
import { ActionType } from "@myTypes/automation-rule";
import dayjs from "dayjs";
import MultipleChecklist from "./multiple-checklist";
import MultipleDates from "./multiple-dates";
import { MultipleDatesProvider } from "./multiple-dates/context";
import RichTextInput from "@components/rich-text-input";

// Helper function to extract placeholders from a pattern
function extractPlaceholders(pattern: string): string[] {
  const regex = /<([^>]+)>|\[([^\]]+)\]/g; // Matches both <...> and [...]
  const placeholders: string[] = [];

  let match;
  while ((match = regex.exec(pattern)) !== null) {
    placeholders.push(match[1] || match[2]);
  }
  return placeholders.filter(Boolean);
}

interface SelectActionProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
}

// Component for select dropdown in actions
const SelectOption = ({
  props,
  data,
  placeholder,
  item,
  groupIndex,
  index,
}: {
  props: SelectActionProps;
  data: TriggerItemSelection;
  placeholder: string;
  item: ActionItems;
  groupIndex: number;
  index: number;
}) => {
  const { setActionsData, actionsData } = props;
  const listSelectionRef = useRef<SelectionRef>(null);
  const userSelectionRef = useRef<SelectionRef>(null);
  const customFieldSelectionRef = useRef<SelectionRef>(null);
  const fieldValueInputRef = useRef<SelectionRef>(null);
  const boardSelectionRef = useRef<SelectionRef>(null);
  const labelSelectionRef = useRef<SelectionRef>(null);

  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));

  // Handle ListSelection change - use the actual placeholder as key
  const onListChange = (selectedOption: any, selectionName: string) => {
    let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value =
      selectedOption;

    setActionsData(copyArr);
  };

  const onUserChange = (selectedOption: any, selectionName: string) => {
    let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value =
      selectedOption;
    setActionsData(copyArr);
  };

  const onCustomFieldChange = (selectedOption: any, selectionName: string) => {
    let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[selectionName] as any).value =
      selectedOption;
    setActionsData(copyArr);
  };

  // Handle regular Select change
  const onSelectChange = (
    selectedOption: GeneralOptions,
    selectionName: string
  ) => {
    let copyArr = [...actionsData];

    (copyArr[groupIndex]?.items?.[index]?.[selectionName] as any).value =
      selectedOption;
    setActionsData(copyArr);
  };

  // Handle field value input change
  const onFieldValueChange = (value: any) => {
    let copyArr = [...actionsData];
    (
      copyArr[groupIndex]?.items?.[index]?.[EnumInputType.FieldValue] as any
    ).value = value;
    setActionsData(copyArr);
  };

  if (placeholder === EnumInputType.FieldValue) {
    const field = (actionsData[groupIndex]?.items?.[index] as any)?.[
      EnumSelectionType.Fields
    ]?.value as any;
    return (
      <FieldValueInput
        key={`field-value-input-${item.type}-${placeholder}`}
        width={"fit-content"}
        ref={fieldValueInputRef}
        field={field}
        onChange={(val: any, option: any) => {
          onFieldValueChange(option || val);
        }}
        className="mx-2"
      />
    );
  }

  if (
    placeholder === EnumSelectionType.Fields ||
    placeholder === EnumSelectionType.MultiFields
  ) {
    return (
      <CustomFieldSelection
        width={"fit-content"}
        ref={customFieldSelectionRef}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || ""
        }
        onChange={(val: string, option: any) => {
          console.log("CustomFieldSelection onChange called:", option);
          onCustomFieldChange(option, placeholder);
        }}
        className="mx-2"
        filterTypes={(item[placeholder] as any)?.fieldTypeFilter}
        key={`custom-field-selection-${index}`}
        multi={placeholder === EnumSelectionType.MultiFields}
      />
    );
  }

  if (placeholder === EnumTextType.SelectedUser) {
    return <span className="font-bold mx-1"> selected user </span>;
  }

  if (
    placeholder === EnumSelectionType.User ||
    placeholder === EnumSelectionType.MultiUsers
  ) {
    return (
      <UserSelection
        width={"fit-content"}
        ref={userSelectionRef}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || undefined
        }
        onChange={(option: any) => {
          console.log("UserSelection onChange called:", option);
          onUserChange(option, placeholder);
        }}
        className="mx-2"
        key={`user-selection-${index}`}
        placeholder={data.placeholder}
        mode={
          placeholder === EnumSelectionType.MultiUsers ? "multiple" : undefined
        }
      />
    );
  }

  // Check if this should render as ListSelection
  if (
    placeholder === EnumSelectionType.List ||
    placeholder === EnumSelectionType.OptionalList
  ) {
    return (
      <ListSelection
        width={"fit-content"}
        ref={listSelectionRef}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || undefined
        }
        onChange={(option: any) => {
          onListChange(option, placeholder);
        }}
        className="mx-2"
        placeholder={data.placeholder}
        key={`list-selection-${index}`}
      />
    );
  }

  if (placeholder === EnumInputType.DateValue) {
    // If this action is MoveDateCustomField, render custom selector
    if (
      [
        ActionType.MoveDateCustomField,
        ActionType.SetDateCustomField,
        ActionType.MoveChecklistItemDueDate,
        ActionType.SetChecklistItemDueDate,
      ].includes(actionsData[groupIndex]?.items?.[index]?.type as any)
    ) {
      return (
        <MoveDateSelector
          key={`move-date-selector-${groupIndex}-${index}`}
          groupIndex={groupIndex}
          index={index}
          placeholder={placeholder}
          actionsData={actionsData}
          setActionsData={setActionsData}
        />
      );
    }

    // If this action is SetDateCustomField, render MoveDateSelector (same as MoveDateCustomField)
    if ((item as any)?.type === ActionType.SetDateCustomField) {
      return (
        <MoveDateSelector
          key={`set-date-selector-${groupIndex}-${index}`}
          groupIndex={groupIndex}
          index={index}
          placeholder={placeholder}
          actionsData={actionsData}
          setActionsData={setActionsData}
        />
      );
    }

    const defaultOptions = [
      { value: "now", label: "now" },
      { value: "today", label: "today" },
      { value: "tomorrow", label: "tomorrow" },
      { value: "yesterday", label: "yesterday" },
      { value: "next_working_day", label: "the next working day" },
    ];

    const presetOptionsRaw: any = (item as any)?.[EnumInputType.DateValue]
      ?.options;
    const presetOptions: any[] = Array.isArray(presetOptionsRaw)
      ? presetOptionsRaw
      : defaultOptions;

    const defaultValue = presetOptions.length > 0 ? presetOptions[0] : null;

    // @ts-ignore
    const currentVal =
      (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value ??
      defaultValue;

    const handleSelect = (opt: any) => {
      let copy = [...actionsData];
      if (copy[groupIndex]?.items?.[index]) {
        (copy[groupIndex].items[index] as any)[placeholder] = opt;
        setActionsData(copy);
      }
    };

    const popContent = (
      <div className="flex flex-col gap-2">
        {presetOptions.map((opt: any) => (
          <Button key={opt.value} type="text" onClick={() => handleSelect(opt)}>
            {opt.label}
          </Button>
        ))}
      </div>
    );

    return (
      <Popover content={popContent} trigger="click">
        <Button size="small" className="mx-2 flex items-center gap-1">
          {currentVal?.label || currentVal}
          <Calendar size={12} />
        </Button>
      </Popover>
    );
  }

  if (placeholder === EnumSelectionType.Board) {
    return (
      <BoardSelection
        width={"fit-content"}
        ref={boardSelectionRef}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || undefined
        }
        onChange={(option: any) => {
          onListChange(option, placeholder);
        }}
        className="mx-2"
        placeholder={data.placeholder}
        key={`board-selection-${index}`}
      />
    );
  }

  if (
    placeholder === EnumSelectionType.MultiLabels ||
    placeholder === EnumSelectionType.CardLabel
  ) {
    return (
      <LabelSelection
        width={"fit-content"}
        ref={labelSelectionRef}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || undefined
        }
        onChange={(option: any) => {
          onListChange(option, placeholder);
        }}
        className="mx-2"
        placeholder={data.placeholder}
        key={`label-selection-${index}`}
        mode={
          placeholder === EnumSelectionType.MultiLabels ? "multiple" : undefined
        }
      />
    );
  }

  if (placeholder === EnumSelectionType.MultiChecklists) {
    return (
      <MultipleChecklist
        {...props}
        groupIndex={groupIndex}
        index={index}
        placeholder={placeholder}
      />
    );
  }

  if (placeholder === EnumSelectionType.MultiDates) {
    return (
      <MultipleDatesProvider>
        <MultipleDates
          {...props}
          groupIndex={groupIndex}
          index={index}
          placeholder={placeholder}
        />
      </MultipleDatesProvider>
    );
  }

  // Render regular Select
  return (
    <Select
      key={`${placeholder}-${index}`}
      value={
        (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
          ?.value || ""
      }
      options={options}
      labelInValue={false}
      style={{ width: 120, margin: "0 5px" }}
      onChange={(value, option) => {
        onSelectChange(
          (option as { option: GeneralOptions }).option,
          placeholder
        );
      }}
    />
  );
};

const renderLabelWithSelects = (
  props: SelectActionProps,
  item: ActionItems,
  lastActionIndex: number,
  groupIndex: number,
  index: number
) => {
  // If there's no placeholder in the label, just return the text
  if (!item.label.includes("<")) {
    return (
      <div className="flex items-center gap-2">
        <Typography.Text>{item.label}</Typography.Text>
        {/* Add filter buttons for FindCardByTitle after the label */}
        {item.type === ActionType.FindCardByTitle && (
          <>
            <ListFilterButton
              actionType={item.type}
              groupIndex={groupIndex}
              index={index}
              props={props}
            />
            <BoardFilterButton
              actionType={item.type}
              groupIndex={groupIndex}
              index={index}
              props={props}
            />
          </>
        )}
      </div>
    );
  }

  // Split the label by <...> or [...] placeholders
  const parts = item.label.split(/(<[^>]+>|\[[^\]]+\])/);

  return (
    <div className="flex items-center flex-wrap">
      {parts.map((part: string, indexPart: number) => {
        // Check if this part is a placeholder
        if (part.startsWith("<") && part.endsWith(">")) {
          const placeholder = part.trim().slice(1, -1); // Remove < and >

          // Handle text input
          if (
            (placeholder === EnumSelectionType.TextInput ||
              placeholder === EnumSelectionType.ChecklistName ||
              placeholder === "text_input_2" ||
              placeholder === EnumInputType.TextTitle ||
              placeholder === EnumInputType.TextDescription) &&
            item[placeholder]
          ) {
            const data = item[placeholder] as {
              placeholder?: string;
              value: string;
              isRichText?: boolean;
            };

            // Use RichTextInput for description fields
            if (data?.isRichText) {
              return (
                <RichTextInput
                  key={`action-rich-input-${indexPart}`}
                  value={data?.value || ""}
                  placeholder={data?.placeholder || "Enter description..."}
                  onChange={(value) => {
                    const updatedActions = [...props.actionsData];
                    if (updatedActions[groupIndex]?.items?.[index]) {
                      (updatedActions[groupIndex].items[index] as any)[
                        placeholder
                      ] = {
                        ...(updatedActions[groupIndex].items[index] as any)[
                          placeholder
                        ],
                        value,
                      };
                      props.setActionsData(updatedActions);
                    }
                  }}
                  className="mx-2"
                />
              );
            }

            return (
              <TextInput
                key={`action-input-${indexPart}`}
                value={data?.value || ""}
                placeholder={data?.placeholder || "Enter message..."}
                onChange={(value) => {
                  const updatedActions = [...props.actionsData];
                  if (updatedActions[groupIndex]?.items?.[index]) {
                    (updatedActions[groupIndex].items[index] as any)[
                      placeholder
                    ] = {
                      ...(updatedActions[groupIndex].items[index] as any)[
                        placeholder
                      ],
                      value,
                    };
                    props.setActionsData(updatedActions);
                  }
                }}
                groupIndex={groupIndex}
                index={index}
                actionsData={props.actionsData}
                setActionsData={props.setActionsData}
              />
            );
          }

          // Handle select inputs (channel, list, etc.)
          if (
            placeholder in item ||
            placeholder === EnumSelectionType.List ||
            placeholder === EnumSelectionType.OptionalList ||
            placeholder === EnumSelectionType.Channel
          ) {
            const data: TriggerItemSelection = item[
              placeholder
            ] as TriggerItemSelection;

            return (
              <SelectOption
                key={`action-select-${indexPart}`}
                props={props}
                data={data}
                placeholder={placeholder}
                item={item}
                groupIndex={groupIndex}
                index={index}
              />
            );
          }

          // If no match found, just render the placeholder as text
          return <span key={indexPart}>{"<" + placeholder + ">"}</span>;
        }

        // Check if this part is a square bracket placeholder [...]
        if (part.startsWith("[") && part.endsWith("]")) {
          const placeholder = part.trim().slice(1, -1); // Remove [ and ]

          // Handle number input
          if (placeholder === EnumInputType.Number) {
            const value = (
              props.actionsData[groupIndex]?.items?.[index] as any
            )?.[EnumInputType.Number];

            return (
              <Input
                key={`number-input-${indexPart}`}
                type="number"
                value={value || ""}
                placeholder="Enter number"
                style={{ width: "100px", margin: "0 5px" }}
                onChange={(e) => {
                  const updatedActions = [...props.actionsData];
                  if (updatedActions[groupIndex]?.items?.[index]) {
                    (updatedActions[groupIndex].items[index] as any)[
                      EnumInputType.Number
                    ] = parseInt(e.target.value) || 0;
                    props.setActionsData(updatedActions);
                  }
                }}
              />
            );
          }

          // Handle text input
          if (placeholder === EnumInputType.Text) {
            const value = (
              props.actionsData[groupIndex]?.items?.[index] as any
            )?.[EnumInputType.Text];

            return (
              <Input
                key={`text-input-${indexPart}`}
                value={value || ""}
                placeholder="Enter text"
                style={{ width: "150px", margin: "0 5px" }}
                onChange={(e) => {
                  const updatedActions = [...props.actionsData];
                  if (updatedActions[groupIndex]?.items?.[index]) {
                    (updatedActions[groupIndex].items[index] as any)[
                      EnumInputType.Text
                    ] = e.target.value;
                    props.setActionsData(updatedActions);
                  }
                }}
              />
            );
          }

          // If no match found, just render the placeholder as text
          return <span key={indexPart}>{"[" + placeholder + "]"}</span>;
        }

        // For regular text parts, just render as text
        return <span key={indexPart}>{part}</span>;
      })}

      {/* Add filter buttons at the end for FindCardByTitle actions */}
      {item.type === ActionType.FindCardByTitle && (
        <>
          <ListFilterButton
            actionType={item.type}
            groupIndex={groupIndex}
            index={index}
            props={props}
          />
          <BoardFilterButton
            actionType={item.type}
            groupIndex={groupIndex}
            index={index}
            props={props}
          />
        </>
      )}
    </div>
  );
};

// Component for text input in actions
const TextInput = ({
  value,
  placeholder,
  onChange,
  groupIndex,
  index,
  actionsData,
  setActionsData,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  groupIndex: number;
  index: number;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Update the actionsData directly
    const updatedActions = [...actionsData];
    if (updatedActions[groupIndex]?.items?.[index]) {
      (updatedActions[groupIndex].items[index] as any)[placeholder] = {
        ...(updatedActions[groupIndex].items[index] as any)[placeholder],
        value: newValue,
      };
      setActionsData(updatedActions);
    }
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={{ width: 200, margin: "0 5px" }}
    />
  );
};

interface MoveDateSelectorProps {
  groupIndex: number;
  index: number;
  placeholder: string;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
}

const MoveDateSelector: React.FC<MoveDateSelectorProps> = ({
  groupIndex,
  index,
  placeholder,
  actionsData,
  setActionsData,
}) => {
  // Current automation-rule item
  const trgItem = actionsData[groupIndex]?.items?.[index] as any;
  const expressions: any[] = trgItem?.[placeholder]?.expressions || [];

  const [open, setOpen] = useState(false);

  /* --------------------------------------------------
   *  Section-specific transient UI states
   * --------------------------------------------------*/
  // 1. Quick preset "to ..." section
  const [toPreset, setToPreset] = useState<string>("the_previous_working_day");

  // 2. Offset "by N days|weeks" section
  const [byOffset, setByOffset] = useState<{ number: string; unit: string }>({
    number: "1",
    unit: "days",
  });

  // 3. "to the next <weekday>" section
  const [nextWeekday, setNextWeekday] = useState<string>("monday");

  // 4. "to <ordinal> of <month-specifier>" section
  const [dayOfMonth, setDayOfMonth] = useState<{
    day: string;
    of: string;
  }>({ day: "the_1st", of: "the_month" });

  // 5. "to <ordinal> <weekday> of <month-specifier>" section
  const [nthWeekdayOfMonth, setNthWeekdayOfMonth] = useState<{
    nth: string;
    weekday: string;
    of: string;
  }>({ nth: "the_1st", weekday: "monday", of: "the_month" });

  /* --------------------------------------------------
   *  Static option lists
   * --------------------------------------------------*/
  const presetOptions = [
    { value: "the_previous_working_day", label: "the previous working day" },
    { value: "the_same_day_next_week", label: "the same day next week" },
    { value: "the_same_day_next_month", label: "the same day next month" },
    { value: "the_same_day_next_year", label: "the same day next year" },
    { value: "today", label: "today" },
    { value: "tomorrow", label: "tomorrow" },
    { value: "yesterday", label: "yesterday" },
  ];

  const weekdayOptions = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].map((d) => ({ value: d, label: d }));

  const ordinalOptions = (
    [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    ] as const
  ).map((n) => ({
    value: `the_${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`,
    label: `the ${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`,
  }));
  ordinalOptions.push(
    { value: "the_last", label: "the last" },
    { value: "the_last_day", label: "the last day" },
    { value: "the_last_working_day", label: "the last working day" }
  );

  const monthSpecifierOptions = [
    { value: "the_month", label: "the month" },
    { value: "next_month", label: "next month" },
  ];

  /* --------------------------------------------------
   *  Helpers – expression add / remove
   * --------------------------------------------------*/
  const updateExpressions = (newExprs: any[]) => {
    const copy = [...actionsData];
    if (!copy[groupIndex]?.items?.[index]) return;
    const itemRef: any = copy[groupIndex].items[index];

    if (!itemRef[placeholder]) itemRef[placeholder] = { expressions: [] };
    itemRef[placeholder].expressions = newExprs;

    setActionsData(copy);
  };

  const addExpression = (text: string, value: any) => {
    updateExpressions([...expressions, { text, value }]);
    setOpen(false);
  };

  const removeExpression = (idx: number) => {
    updateExpressions(expressions.filter((_, i) => i !== idx));
  };

  /* --------------------------------------------------
   *  Add-handlers per section
   * --------------------------------------------------*/
  const onAddPreset = () => {
    const label =
      presetOptions.find((o) => o.value === toPreset)?.label || toPreset;
    addExpression(label, toPreset);
  };

  const onAddByOffset = () => {
    addExpression(`by ${byOffset.number} ${byOffset.unit}`, { ...byOffset });
  };

  const onAddNextWeekday = () => {
    addExpression(`to the next ${nextWeekday}`, { weekday: nextWeekday });
  };

  const onAddDayOfMonth = () => {
    addExpression(
      `${dayOfMonth.day.replace(/_/g, " ")} of ${dayOfMonth.of.replace(
        /_/g,
        " "
      )}`,
      { ...dayOfMonth }
    );
  };

  const onAddNthWeekdayMonth = () => {
    addExpression(
      `${nthWeekdayOfMonth.nth.replace(/_/g, " ")} ${
        nthWeekdayOfMonth.weekday
      } of ${nthWeekdayOfMonth.of.replace(/_/g, " ")}`,
      { ...nthWeekdayOfMonth }
    );
  };

  /* --------------------------------------------------
   *  Render
   * --------------------------------------------------*/
  return (
    <div className="flex items-center gap-2">
      {expressions.map((expr, i) => (
        <span
          key={i}
          className="inline-flex items-center bg-gray-500 text-white rounded px-2 py-1 text-sm"
        >
          {expr.text}
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
            <div className="p-2 flex flex-col gap-3 w-max">
              {/* 1️⃣  Quick preset */}
              <div className="flex items-center gap-2">
                <span>to</span>
                <Select
                  style={{ width: 230 }}
                  value={toPreset}
                  options={presetOptions}
                  onChange={(val) => setToPreset(val)}
                />
                <Button type="text" size="small" onClick={onAddPreset}>
                  <Plus size={12} />
                </Button>
              </div>

              <hr />

              {/* 2️⃣  Offset */}
              <div className="flex items-center gap-2">
                <span>by</span>
                <Input
                  style={{ width: 60 }}
                  type="number"
                  value={byOffset.number}
                  onChange={(e) =>
                    setByOffset((p) => ({ ...p, number: e.target.value }))
                  }
                />
                <Select
                  style={{ width: 90 }}
                  value={byOffset.unit}
                  options={[
                    { value: "days", label: "days" },
                    { value: "weeks", label: "weeks" },
                  ]}
                  onChange={(val) => setByOffset((p) => ({ ...p, unit: val }))}
                />
                <Button type="text" size="small" onClick={onAddByOffset}>
                  <Plus size={12} />
                </Button>
              </div>

              <hr />

              {/* 3️⃣  Next weekday */}
              <div className="flex items-center gap-2">
                <span>to the next</span>
                <Select
                  style={{ width: 120 }}
                  value={nextWeekday}
                  options={weekdayOptions}
                  onChange={(val) => setNextWeekday(val)}
                />
                <Button type="text" size="small" onClick={onAddNextWeekday}>
                  <Plus size={12} />
                </Button>
              </div>

              <hr />

              {/* 4️⃣  Day of month */}
              <div className="flex items-center gap-2">
                <span>to</span>
                <Select
                  style={{ width: 120 }}
                  value={dayOfMonth.day}
                  options={ordinalOptions}
                  onChange={(val) => setDayOfMonth((p) => ({ ...p, day: val }))}
                />
                <span>of</span>
                <Select
                  style={{ width: 120 }}
                  value={dayOfMonth.of}
                  options={monthSpecifierOptions}
                  onChange={(val) => setDayOfMonth((p) => ({ ...p, of: val }))}
                />
                <Button type="text" size="small" onClick={onAddDayOfMonth}>
                  <Plus size={12} />
                </Button>
              </div>

              <hr />

              {/* 5️⃣  Nth weekday of month */}
              <div className="flex items-center gap-2">
                <span>to</span>
                <Select
                  style={{ width: 120 }}
                  value={nthWeekdayOfMonth.nth}
                  options={[
                    { value: "the_1st", label: "the 1st" },
                    { value: "the_2nd", label: "the 2nd" },
                    { value: "the_3rd", label: "the 3rd" },
                    { value: "the_4th", label: "the 4th" },
                    { value: "the_last", label: "the last" },
                  ]}
                  onChange={(val) =>
                    setNthWeekdayOfMonth((p) => ({ ...p, nth: val }))
                  }
                />
                <Select
                  style={{ width: 120 }}
                  value={nthWeekdayOfMonth.weekday}
                  options={weekdayOptions}
                  onChange={(val) =>
                    setNthWeekdayOfMonth((p) => ({ ...p, weekday: val }))
                  }
                />
                <span>of</span>
                <Select
                  style={{ width: 120 }}
                  value={nthWeekdayOfMonth.of}
                  options={monthSpecifierOptions}
                  onChange={(val) =>
                    setNthWeekdayOfMonth((p) => ({ ...p, of: val }))
                  }
                />
                <Button type="text" size="small" onClick={onAddNthWeekdayMonth}>
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

/*************************************************
 * SetDateSelector – for "set date custom field to"
 *************************************************/
interface SetDateSelectorProps {
  groupIndex: number;
  index: number;
  placeholder: string;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
  presetOptions: { value: string; label: string }[];
}

const SetDateSelector: React.FC<SetDateSelectorProps> = ({
  groupIndex,
  index,
  placeholder,
  actionsData,
  setActionsData,
  presetOptions,
}) => {
  const trgItem = actionsData[groupIndex]?.items?.[index] as any;
  const selected = trgItem?.[placeholder]?.value ?? null;

  /** helper to update selected value */
  const updateValue = (val: any) => {
    const copy = [...actionsData];
    const itemRef: any = copy[groupIndex]?.items?.[index];
    if (!itemRef) return;
    itemRef[placeholder] = { ...(itemRef[placeholder] || {}), value: val };
    setActionsData(copy);
  };

  const clearValue = () => updateValue(null);

  const [open, setOpen] = useState(false);

  const popContent = (
    <div className="p-2 flex flex-col gap-2 w-max">
      {presetOptions.map((opt) => (
        <Button
          key={opt.value}
          type="text"
          size="small"
          onClick={() => {
            updateValue(opt);
            setOpen(false);
          }}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );

  if (selected) {
    return (
      <span className="inline-flex items-center bg-gray-500 text-white rounded px-2 py-1 text-sm">
        {selected.label || selected}
        <X size={12} className="ml-1 cursor-pointer" onClick={clearValue} />
      </span>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      content={popContent}
    >
      <Button type="text" size="small" className="mx-2">
        <Calendar size={14} />
      </Button>
    </Popover>
  );
};

// Component for list filter in cascade actions
const ListFilterButton = ({
  actionType,
  groupIndex,
  index,
  props,
}: {
  actionType: string;
  groupIndex: number;
  index: number;
  props: SelectActionProps;
}) => {
  const { actionsData, setActionsData } = props;

  // Only show for FindCardByTitle action
  if (actionType !== ActionType.FindCardByTitle) {
    return null;
  }

  const actionItem = actionsData[groupIndex]?.items?.[index];
  const hasListFilter =
    actionItem &&
    (actionItem as any)[EnumSelectionType.SelectableList] !== undefined;

  const handleToggleListFilter = () => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item) {
      if (hasListFilter) {
        delete item[EnumSelectionType.SelectableList];
      } else {
        item[EnumSelectionType.SelectableList] = null;
      }
      setActionsData(copyArr);
    }
  };

  const handleListChange = (selectedOption: any) => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item) {
      item[EnumSelectionType.SelectableList] = selectedOption;
      setActionsData(copyArr);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="text"
        size="small"
        className="mx-2"
        onClick={handleToggleListFilter}
      >
        <Plus size={14} />
      </Button>
      {hasListFilter && (
        <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
          <span className="text-sm">in list</span>
          <ListSelection
            width={"120px"}
            value={
              (actionItem as any)?.[EnumSelectionType.SelectableList]?.value ||
              undefined
            }
            onChange={(option: any) => {
              handleListChange(option);
            }}
            placeholder="Select list"
          />
          <Button type="text" size="small" onClick={handleToggleListFilter}>
            <X size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};

// Component for board filter in cascade actions
const BoardFilterButton = ({
  actionType,
  groupIndex,
  index,
  props,
}: {
  actionType: string;
  groupIndex: number;
  index: number;
  props: SelectActionProps;
}) => {
  const { actionsData, setActionsData } = props;

  // Only show for FindCardByTitle action
  if (actionType !== ActionType.FindCardByTitle) {
    return null;
  }

  const actionItem = actionsData[groupIndex]?.items?.[index];
  const hasBoardFilter =
    actionItem &&
    (actionItem as any)[EnumSelectionType.SelectableBoard] !== undefined;

  const handleToggleBoardFilter = () => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item) {
      if (hasBoardFilter) {
        delete item[EnumSelectionType.SelectableBoard];
      } else {
        item[EnumSelectionType.SelectableBoard] = null;
      }
      setActionsData(copyArr);
    }
  };

  const handleBoardChange = (selectedOption: any) => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item) {
      item[EnumSelectionType.SelectableBoard] = selectedOption;
      setActionsData(copyArr);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="text"
        size="small"
        className="mx-2"
        onClick={handleToggleBoardFilter}
      >
        <Plus size={14} />
      </Button>
      {hasBoardFilter && (
        <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
          <span className="text-sm">in board</span>
          <BoardSelection
            width={"120px"}
            value={
              (actionItem as any)?.[EnumSelectionType.SelectableBoard]?.value ||
              undefined
            }
            onChange={(option: any) => {
              handleBoardChange(option);
            }}
            placeholder="Select board"
          />
          <Button type="text" size="small" onClick={handleToggleBoardFilter}>
            <X size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};

// Component for date expression selector in actions (similar to triggers)
const DateExpressionSelector = ({
  groupIndex,
  index,
  placeholder,
  actionsData,
  setActionsData,
}: {
  groupIndex: number;
  index: number;
  placeholder: string;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
}) => {
  const itemState = actionsData[groupIndex]?.items?.[index] as any;
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

    const copyArr = [...actionsData];
    const actionItem = copyArr[groupIndex]?.items?.[index] as any;

    if (actionItem) {
      if (!actionItem[placeholder]) {
        actionItem[placeholder] = {
          options: [],
          value: null,
          expressions: [],
        };
      }
      actionItem[placeholder].expressions = [...expressions, newExpression];
    }

    setActionsData(copyArr);
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
    const copyArr = [...actionsData];
    const actionItem = copyArr[groupIndex]?.items?.[index] as any;
    if (actionItem?.[placeholder]?.expressions) {
      actionItem[placeholder].expressions = expressions.filter(
        (_: unknown, i: number) => i !== indexToRemove
      );
    }
    setActionsData(copyArr);
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

const SelectAction: React.FC<SelectActionProps> = (props) => {
  const { setSelectedRule, selectedRule, actionsData, nextStep } = props;
  const [actionItemsByActionType, setActionItemsByActionType] = useState<
    ActionItems[]
  >([]);
  const [lastActionIndex, setLastActionIndex] = useState<number>(0);
  const [groupIndex, setGroupIndex] = useState<number>(0);

  useEffect(() => {
    // Initialize with first action type if no actions exist yet
    if (!selectedRule.actions || selectedRule.actions.length === 0) {
      const newAction: SelectedAction = {
        type: actions[0].type,
      };

      setSelectedRule((prev: AutomationRule) => ({
        ...prev,
        actions: [newAction],
      }));

      setLastActionIndex(0);
    } else {
      setLastActionIndex(selectedRule.actions.length - 1);
    }
  }, []);

  useEffect(() => {
    // Update the action items based on the selected action type
    if (selectedRule?.actions && lastActionIndex >= 0) {
      const currentAction = selectedRule.actions[lastActionIndex];
      if (currentAction) {
        const filter = actions.find((item) => item.type === currentAction.type);
        setActionItemsByActionType(filter?.items || []);
      }
    }
  }, [selectedRule.actions, lastActionIndex]);

  // Function to handle action type selection
  const onActionTypeClick = (type: string) => {
    // Find the group index for this action type
    const actionGroupIndex = actionsData.findIndex(
      (group) => group.type === type
    );
    if (actionGroupIndex !== -1) {
      setGroupIndex(actionGroupIndex);
    }

    setSelectedRule((prev: AutomationRule) => {
      const updatedActions = [...(prev.actions || [])];

      // Create or update the action at lastActionIndex
      if (updatedActions[lastActionIndex]) {
        updatedActions[lastActionIndex] = {
          ...updatedActions[lastActionIndex],
          type,
        };
      } else {
        updatedActions[lastActionIndex] = { type };
      }

      return {
        ...prev,
        actions: updatedActions,
      };
    });
  };

  const onAddAction = (index: number) => {
    const newActionItem: SelectedAction = {
      groupType: actionsData[groupIndex].type,
      type: actionsData[groupIndex]?.items?.[index]?.type || "",
    };

    const placeholders = extractPlaceholders(
      actionsData[groupIndex]?.items?.[index]?.type || ""
    );

    placeholders?.forEach((placeholder) => {
      const items = actionsData[groupIndex]?.items;
      if (items && items[index][placeholder]) {
        if (!newActionItem.selectedActionItem) {
          newActionItem.selectedActionItem = { type: "", label: "" };
        }
        newActionItem.selectedActionItem.type = items?.[index]?.type || "";
        newActionItem.selectedActionItem.label = items?.[index]?.label;
        const placeholderData = items?.[index]?.[placeholder] as any;
        const rawVal =
          typeof placeholderData === "object" &&
          placeholderData &&
          "value" in placeholderData
            ? placeholderData.value
            : placeholderData;

        if (
          placeholder === EnumSelectionType.Fields ||
          placeholder === EnumInputType.FieldValue ||
          placeholder === EnumInputType.DateValue
        ) {
          // Handle DateValue for MoveDateCustomField (expressions format) - like triggers
          if (
            placeholder === EnumInputType.DateValue &&
            [
              ActionType.MoveDateCustomField,
              ActionType.SetDateCustomField,
            ].includes(actionsData[groupIndex]?.items?.[index]?.type as any)
          ) {
            // Copy expressions array directly like in triggers
            newActionItem.selectedActionItem[placeholder] =
              (items?.[index]?.[placeholder] as any)?.expressions || [];
            return;
          } else {
            // Preserve the full option/object when available (contains label, value, type, etc.)
            newActionItem.selectedActionItem[placeholder] = rawVal;
          }
        } else {
          // For simple scalar selections keep just the primitive
          newActionItem.selectedActionItem[placeholder] =
            typeof rawVal === "object" && rawVal !== null && "value" in rawVal
              ? (rawVal as any).value
              : rawVal;
        }
      }
    });

    // Ensure constant action field included and base type filled even when no placeholders
    const itemConfig = (actionsData[groupIndex]?.items?.[index] as any) ?? {};
    if (itemConfig?.[EnumSelectionType.Action]) {
      if (!newActionItem.selectedActionItem)
        newActionItem.selectedActionItem = { type: "", label: "" } as any;
      if (newActionItem.selectedActionItem)
        newActionItem.selectedActionItem.type = itemConfig.type || "";
      const actionConfig = itemConfig[EnumSelectionType.Action];
      // Extract the actual enum value from the nested structure
      const actionValue = actionConfig?.value?.value || actionConfig?.value;
      (newActionItem.selectedActionItem as any)[EnumSelectionType.Action] =
        actionValue;
    }

    let copy = { ...selectedRule };
    copy.actions?.push(newActionItem);
    const filtered = copy.actions?.filter(
      (item) => item.type && item.selectedActionItem?.type
    );
    copy.actions = filtered;
    setSelectedRule(copy);
    nextStep();
  };

  return (
    <div>
      <Typography.Title level={5}>Select Action</Typography.Title>
      <div className="flex gap-2 my-4">
        {actionsData?.map((item: AutomationRuleAction, index: number) => (
          <div
            key={index}
            onClick={() => onActionTypeClick(item.type)}
            className={`flex flex-col justify-center items-center w-64 rounded p-2 cursor-pointer ${
              selectedRule?.actions?.[lastActionIndex]?.type === item.type
                ? "bg-blue-100"
                : "bg-gray-300"
            }`}
          >
            <div>{item?.icon}</div>
            <Typography.Text>{item.label}</Typography.Text>
          </div>
        ))}
      </div>

      <div>
        {actionsData[groupIndex]?.items?.map(
          (item: ActionItems, index: number) => (
            <div key={index}>
              <div className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200">
                <div>
                  {renderLabelWithSelects(
                    props,
                    item,
                    lastActionIndex,
                    groupIndex,
                    index
                  )}
                </div>
                <Button
                  shape="circle"
                  onClick={() => {
                    onAddAction(index);
                  }}
                >
                  <Plus />
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SelectAction;

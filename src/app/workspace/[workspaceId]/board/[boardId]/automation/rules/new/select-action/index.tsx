"use client";
import { Button, Input, Select, Typography, Popover, Modal } from "antd";
import { actions } from "@constants/automation-rule/data";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Plus, Calendar, X, Check } from "lucide-react";
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
  RoleSelection,
} from "@components/selection";
import { EnumSelectionType, EnumTextType } from "@myTypes/automation-rule";
import { EnumInputType } from "@myTypes/automation-rule";
import { ActionType } from "@myTypes/automation-rule";
import { EnumOptionBySubject } from "@myTypes/options";
import dayjs from "dayjs";
import MultipleChecklist from "./multiple-checklist";
import MultipleDates from "./multiple-dates";
import { MultipleDatesProvider } from "./multiple-dates/context";
import RichTextInput from "@components/rich-text-input";
import ExpressionBuilder from "@components/expression-builder";
import { renderRuleStateHuman } from "@utils/rule-render";

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
  // Core props (required for all contexts)
  selectedRule: AutomationRule;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;

  // Navigation props (for step-based contexts like rule creation)
  nextStep?: () => void;
  prevStep?: () => void;

  // Edit mode props (for modal-based contexts like rule editing)
  isEditMode?: boolean;
  onSaveAndClose?: (updatedRule: AutomationRule) => Promise<void>;

  // Additional context props
  numberFields?: Array<{ id: string; name: string }>;
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

  const onBoardChange = (selectedOption: any, selectionName: string) => {
    let copyArr = [...actionsData];
    // Set the selected board
    (copyArr[groupIndex]?.items?.[index]?.[selectionName] as any).value =
      selectedOption;

    // Clear the list selection when board changes (handle both regular and optional types)
    if (copyArr[groupIndex]?.items?.[index]?.[EnumSelectionType.List]) {
      (copyArr[groupIndex].items[index] as any)[EnumSelectionType.List].value =
        null;
    }
    if (copyArr[groupIndex]?.items?.[index]?.[EnumSelectionType.OptionalList]) {
      (copyArr[groupIndex].items[index] as any)[
        EnumSelectionType.OptionalList
      ].value = null;
    }

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

  // Handle role selection change
  const onRoleChange = (selectedOption: any, selectionName: string) => {
    let copyArr = [...actionsData];
    // Handle both single and multiple selection
    if (Array.isArray(selectedOption)) {
      // Multiple selection - store the array directly
      (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value =
        selectedOption;
    } else {
      // Single selection - wrap in array for consistency
      (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value = [
        selectedOption,
      ];
    }
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
    // Get the selected board ID for cross-board actions - try multiple access patterns
    const boardSelection =
      (actionsData[groupIndex]?.items?.[index] as any)?.[
        EnumSelectionType.Board
      ] ||
      (actionsData[groupIndex]?.items?.[index] as any)?.[
        EnumSelectionType.OptionalBoard
      ];
    const selectedBoardId =
      boardSelection?.value?.value || boardSelection?.value || boardSelection;

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
        key={`list-selection-${index}-${selectedBoardId || "no-board"}`} // Update key when board changes
        boardIdProp={selectedBoardId} // Pass the selected board ID
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
        ActionType.MoveCardDateStartOrDue,
        ActionType.SetCardDateStartOrDue,
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
    const currentBoardValue = (
      actionsData[groupIndex]?.items?.[index] as any
    )?.[placeholder]?.value?.value;

    return (
      <BoardSelection
        width={"fit-content"}
        ref={boardSelectionRef}
        value={currentBoardValue || undefined}
        onChange={(option: any) => {
          onBoardChange(option, placeholder);
        }}
        className="mx-2"
        placeholder={data.placeholder}
        key={`board-selection-${index}`}
      />
    );
  }

  if (placeholder === EnumSelectionType.OptionalBoard) {
    const currentBoardValue = (
      actionsData[groupIndex]?.items?.[index] as any
    )?.[placeholder]?.value?.value;

    return (
      <BoardSelection
        width={"fit-content"}
        ref={boardSelectionRef}
        value={currentBoardValue || undefined}
        onChange={(option: any) => {
          onBoardChange(option, placeholder);
        }}
        className="mx-2"
        placeholder={data.placeholder}
        key={`optional-board-selection-${index}`}
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
    <>
      <Select
        key={`${placeholder}-${index}`}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value || ""
        }
        options={options}
        labelInValue={false}
        style={{
          width:
            placeholder === EnumSelectionType.OptionalBySubject ? 260 : 120,
          margin: "0 5px",
        }}
        onChange={(value, option) => {
          onSelectChange(
            (option as { option: GeneralOptions }).option,
            placeholder
          );
        }}
      />

      {(placeholder == EnumSelectionType.OptionalBySubject ||
        placeholder == EnumSelectionType.BySubject) &&
        [
          EnumOptionBySubject.BySpecificUser,
          EnumOptionBySubject.ByAnyoneExceptSpecificUser,
        ].includes(
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value
        ) && (
          <UserSelection
            key={`user-select-${item.type}-${placeholder}`}
            width={"fit-content"}
            ref={useRef<SelectionRef>(null)}
            onChange={(value: string, option: GeneralOptions) => {
              onUserChange(option, placeholder);
            }}
            className="mx-2"
          />
        )}

      {(placeholder == EnumSelectionType.OptionalBySubject ||
        placeholder == EnumSelectionType.BySubject) &&
        [EnumOptionBySubject.ByRole].includes(
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]?.value
            ?.value
        ) && (
          <RoleSelection
            key={`role-select-${item.type}-${placeholder}`}
            width={"fit-content"}
            ref={useRef<SelectionRef>(null)}
            mode="multiple"
            onChange={(
              value: string | string[],
              option: GeneralOptions | GeneralOptions[]
            ) => {
              onRoleChange(option, placeholder);
            }}
            className="mx-2"
            placeholder="Select roles"
          />
        )}
    </>
  );
};

const renderLabelWithSelects = (
  props: SelectActionProps,
  item: ActionItems,
  lastActionIndex: number,
  groupIndex: number,
  index: number,
  isModalOpen?: boolean,
  setIsModalOpen?: (open: boolean) => void
) => {
  // PATCH: For CalculateCustomField, render only the custom UI and return immediately
  if (item.type === ActionType.CalculateCustomField) {
    // Always get the latest steps from parent state
    const expressionSteps =
      (props.actionsData[groupIndex]?.items?.[index] as any)?.[
        EnumSelectionType.Expression
      ]?.steps || [];
    const availableFields = (props.numberFields || []).map((f) => ({
      value: f.id,
      label: f.name,
    }));
    const targetFieldValue =
      (props.actionsData[groupIndex]?.items?.[index] as any)?.[
        EnumSelectionType.Target
      ]?.value || null;

    // Helper to render the expression as a readable string
    const renderExpressionString = () => {
      if (!expressionSteps || expressionSteps.length === 0)
        return <span style={{ color: "#aaa" }}>No expression</span>;
      // Build a string by joining each step, handling spaces and operator placement
      return (
        <span style={{ fontWeight: 500 }}>
          {expressionSteps.map((step: any, i: number) => {
            // Robust: treat as operator if value is +, -, *, /
            if (
              (step.type && step.type === "operator") ||
              (typeof step.value === "string" &&
                ["+", "-", "*", "/"].includes(step.value))
            ) {
              return ` ${step.value} `;
            }
            if (step.type === "field") {
              const field = availableFields.find((f) => f.value === step.value);
              return field ? field.label : step.value;
            }
            if (step.type === "number") {
              return step.value;
            }
            return "";
          })}
        </span>
      );
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>calculate</span>
        <Select
          style={{ minWidth: 180 }}
          placeholder="Select target field"
          options={availableFields}
          value={targetFieldValue}
          onChange={(val) => {
            const updatedActions = [...props.actionsData];
            if (updatedActions[groupIndex]?.items?.[index]) {
              (updatedActions[groupIndex].items[index] as any)[
                EnumSelectionType.Target
              ].value = val;
            }
            props.setActionsData(updatedActions);
          }}
        />
        <span>using</span>
        <Popover
          content={
            <ExpressionBuilder
              key={`expression-builder-${groupIndex}-${index}`}
              value={expressionSteps}
              onChange={(steps) => {
                const updatedActions = [...props.actionsData];
                if (updatedActions[groupIndex]?.items?.[index]) {
                  (updatedActions[groupIndex].items[index] as any)[
                    EnumSelectionType.Expression
                  ].steps = steps;
                }
                props.setActionsData(updatedActions);
              }}
              availableFields={availableFields}
            />
          }
          trigger="click"
          open={!!isModalOpen}
          onOpenChange={(open) => setIsModalOpen && setIsModalOpen(open)}
        >
          <Button
            icon={
              <span role="img" aria-label="calculator">
                🧮
              </span>
            }
          >
            Build expression
          </Button>
        </Popover>
        {/* Show the built expression inline */}
        <span>{renderExpressionString()}</span>
      </div>
    );
  }
  // Patch: Ensure CalculateCustomField <fields> options are populated
  if (item.type === ActionType.CalculateCustomField && props.numberFields) {
    const fieldsObj = item[EnumSelectionType.Fields];
    if (fieldsObj && typeof fieldsObj === "object" && "options" in fieldsObj) {
      (fieldsObj as any).options = (props.numberFields || []).map((f) => ({
        value: f.id,
        label: f.name,
      }));
      console.log(
        "[PATCH] Populated CalculateCustomField options:",
        (fieldsObj as any).options
      );
    }
  }
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

          // PATCH: For CalculateCustomField, render: calculate <target> using <expression> with correct label parts and preserve builder state
          if (item.type === ActionType.CalculateCustomField) {
            const expressionSteps =
              (props.actionsData[groupIndex]?.items?.[index] as any)?.[
                EnumSelectionType.Expression
              ]?.steps || [];
            const availableFields = (props.numberFields || []).map((f) => ({
              value: f.id,
              label: f.name,
            }));
            const targetFieldValue =
              (props.actionsData[groupIndex]?.items?.[index] as any)?.[
                EnumSelectionType.Target
              ]?.value || null;
            const handleTargetFieldChange = (val: string, option: any) => {
              const updatedActions = [...props.actionsData];
              if (updatedActions[groupIndex]?.items?.[index]) {
                (updatedActions[groupIndex].items[index] as any)[
                  EnumSelectionType.Target
                ].value = val;
                props.setActionsData(updatedActions);
              }
            };
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {parts.map((part: string, indexPart: number) => {
                  if (part.startsWith("<") && part.endsWith(">")) {
                    const placeholder = part.trim().slice(1, -1);
                    if (placeholder === EnumSelectionType.Target) {
                      return (
                        <Select
                          key={`target-select-${indexPart}`}
                          style={{ width: 200 }}
                          placeholder="Select target field"
                          value={targetFieldValue}
                          options={availableFields}
                          onChange={handleTargetFieldChange}
                        />
                      );
                    }
                    if (placeholder === EnumSelectionType.Expression) {
                      return (
                        <ExpressionBuilder
                          key={`expression-builder-calc`}
                          value={expressionSteps}
                          onChange={(steps) => {
                            const updatedActions = [...props.actionsData];
                            if (updatedActions[groupIndex]?.items?.[index]) {
                              (updatedActions[groupIndex].items[index] as any)[
                                EnumSelectionType.Expression
                              ] = {
                                ...(
                                  updatedActions[groupIndex].items[index] as any
                                )[EnumSelectionType.Expression],
                                steps,
                              };
                              props.setActionsData(updatedActions);
                            }
                          }}
                          availableFields={availableFields}
                        />
                      );
                    }
                    // skip any other placeholders
                    return null;
                  } else if (part.trim() !== "") {
                    // Render non-placeholder text as-is, preserving spaces
                    return <span key={`text-${indexPart}`}>{part}</span>;
                  } else {
                    return null;
                  }
                })}
              </div>
            );
          }

          // PATCH: For CalculateCustomField, skip rendering <target> as Select elsewhere
          if (
            item.type === ActionType.CalculateCustomField &&
            placeholder === EnumSelectionType.Target
          ) {
            return null;
          }

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
            placeholder === EnumSelectionType.Channel ||
            placeholder === EnumSelectionType.CardLabel
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

          // Handle expression builder
          if (placeholder === EnumSelectionType.Expression) {
            const expressionSteps =
              (props.actionsData[groupIndex]?.items?.[index] as any)?.[
                EnumSelectionType.Expression
              ]?.steps || [];

            // Use real number fields from props
            const availableFields = (props.numberFields || []).map((f) => ({
              value: f.id,
              label: f.name,
            }));

            console.log(
              "Expression Builder - Available Fields:",
              availableFields
            );

            return (
              <ExpressionBuilder
                key={`expression-builder-${indexPart}`}
                value={expressionSteps}
                onChange={(steps) => {
                  const updatedActions = [...props.actionsData];
                  if (updatedActions[groupIndex]?.items?.[index]) {
                    (updatedActions[groupIndex].items[index] as any)[
                      EnumSelectionType.Expression
                    ] = {
                      ...(updatedActions[groupIndex].items[index] as any)[
                        EnumSelectionType.Expression
                      ],
                      steps,
                    };
                    props.setActionsData(updatedActions);
                  }
                }}
                availableFields={availableFields}
              />
            );
          }

          // Handle action placeholder specifically
          if (placeholder === "action") {
            const actionData = (item as any)?.[EnumSelectionType.Action];
            const actionLabel =
              actionData?.value?.label || actionData?.label || "move";
            return <span key={indexPart}>{actionLabel}</span>;
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
  const {
    setSelectedRule,
    selectedRule,
    actionsData,
    nextStep,
    isEditMode,
    onSaveAndClose,
  } = props;
  const [actionItemsByActionType, setActionItemsByActionType] = useState<
    ActionItems[]
  >([]);
  const [lastActionIndex, setLastActionIndex] = useState<number>(0);
  const [groupIndex, setGroupIndex] = useState<number>(0);

  // Modal state for each action index (object: { [index]: boolean })
  const [modalOpenIndex, setModalOpenIndex] = useState<number | null>(null);

  // Track which action is being configured for better UX
  const [configuringActionIndex, setConfiguringActionIndex] = useState<
    number | null
  >(null);

  // Track if we've initialized actions to prevent infinite loop
  const hasInitializedActions = useRef(false);

  console.log("[SEIZURE DEBUG] SelectAction Debug:", {
    actionsData: actionsData?.map((group) => ({
      type: group.type,
      itemsCount: group.items?.length,
    })),
    selectedRule,
    lastActionIndex,
    groupIndex,
    hasInitializedActions: hasInitializedActions.current,
  });

  useEffect(() => {
    // Only update lastActionIndex, don't initialize actions here to prevent loops
    if (selectedRule.actions && selectedRule.actions.length > 0) {
      setLastActionIndex(selectedRule.actions.length - 1);
    } else {
      setLastActionIndex(0);
    }
  }, [selectedRule.actions]);

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
  };

  const onAddAction = (index: number) => {
    // In create mode, don't set configuring state. In edit mode, set it for check/cancel flow
    if (isEditMode) {
      setConfiguringActionIndex(index);
    }

    const actionType = actionsData[groupIndex]?.items?.[index]?.type;

    // Get the existing action if in edit mode
    const existingAction =
      isEditMode && selectedRule.actions && lastActionIndex >= 0
        ? selectedRule.actions[lastActionIndex]
        : null;

    // Special handling for CalculateCustomField
    if (actionType === ActionType.CalculateCustomField) {
      const item = actionsData[groupIndex]?.items?.[index];
      // Type guard for Target
      const targetObj = item?.[EnumSelectionType.Target];
      const expressionObj = item?.[EnumSelectionType.Expression];
      const target =
        targetObj && typeof targetObj === "object" && "value" in targetObj
          ? targetObj.value
          : null;
      const expression =
        expressionObj &&
        typeof expressionObj === "object" &&
        "steps" in expressionObj
          ? expressionObj.steps
          : null;
      // Validation: both must be present
      if (
        !target ||
        !expression ||
        !Array.isArray(expression) ||
        expression.length === 0
      ) {
        alert(
          "Please select a target field and build an expression for calculation."
        );
        return;
      }
      const newActionItem: SelectedAction = {
        // Preserve ID if editing existing action
        ...(existingAction?.id && { id: existingAction.id }),
        groupType: actionsData[groupIndex].type,
        type: actionType,
        selectedActionItem: {
          type: actionType,
          label: item?.label,
          [EnumSelectionType.Target]: target,
          [EnumSelectionType.Expression]: expression,
        },
      };

      let updatedRule;
      if (isEditMode && existingAction) {
        // Update existing action
        const updatedActions = [...(selectedRule.actions || [])];
        updatedActions[lastActionIndex] = newActionItem;
        updatedRule = {
          ...selectedRule,
          actions: updatedActions,
        };
      } else {
        // Add new action with duplicate check
        const existingActions = selectedRule.actions || [];
        const isDuplicate = existingActions.some((existingAction) => {
          const existingType =
            existingAction.type || existingAction.selectedActionItem?.type;

          console.log("[CARD BUTTON LOG] Edit mode - Comparing action:", {
            existingType,
            actionType,
            typesMatch: existingType === actionType,
          });

          if (!existingType || !actionType || existingType !== actionType) {
            return false;
          }

          // For AddRemoveLabel actions, also check the Add/Remove configuration
          if (itemConfig.type === ActionType.AddRemoveLabel) {
            const existingAddRemove =
              existingAction.selectedActionItem?.[EnumSelectionType.AddRemove];
            const newAddRemove =
              newActionItem.selectedActionItem?.[EnumSelectionType.AddRemove];
            const existingCardLabel =
              existingAction.selectedActionItem?.[EnumSelectionType.CardLabel];
            const newCardLabel =
              newActionItem.selectedActionItem?.[EnumSelectionType.CardLabel];

            console.log(
              "[CARD BUTTON LOG] Edit mode - AddRemoveLabel comparison:",
              {
                existingAddRemove,
                newAddRemove,
                existingCardLabel,
                newCardLabel,
                isDuplicate:
                  existingAddRemove === newAddRemove &&
                  JSON.stringify(existingCardLabel) ===
                    JSON.stringify(newCardLabel),
              }
            );

            // Only consider duplicate if both Add/Remove action AND the target label are the same
            return (
              existingAddRemove === newAddRemove &&
              JSON.stringify(existingCardLabel) === JSON.stringify(newCardLabel)
            );
          }

          console.log(
            "[CARD BUTTON LOG] Edit mode - Other action type - comparing configurations"
          );
          // For other action types, compare their main configuration values
          const existingConfig = JSON.stringify(
            existingAction.selectedActionItem
          );
          const newConfig = JSON.stringify(newActionItem.selectedActionItem);

          console.log(
            "[CARD BUTTON LOG] Edit mode - Configuration comparison:",
            {
              existingConfig,
              newConfig,
              isDuplicate: existingConfig === newConfig,
            }
          );

          return existingConfig === newConfig;
        });

        if (!isDuplicate) {
          updatedRule = {
            ...selectedRule,
            actions: [...existingActions, newActionItem],
          };
        } else {
          // Don't add duplicate, just return
          return;
        }
      }

      setSelectedRule(updatedRule);

      // Hide action selection after adding for better UX
      setConfiguringActionIndex(-1);
      return;
    }

    // Get item configuration first
    const itemConfig = (actionsData[groupIndex]?.items?.[index] as any) ?? {};

    const newActionItem: SelectedAction = {
      // Preserve ID if editing existing action
      ...(existingAction?.id && { id: existingAction.id }),
      groupType: actionsData[groupIndex].type,
      type:
        itemConfig.type || actionsData[groupIndex]?.items?.[index]?.type || "",
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

    // Ensure selectedActionItem is always initialized with proper type
    if (!newActionItem.selectedActionItem) {
      newActionItem.selectedActionItem = {
        type: actionsData[groupIndex]?.items?.[index]?.type || "",
        label: actionsData[groupIndex]?.items?.[index]?.label || "",
      };
    }

    // Ensure constant action field included and base type filled even when no placeholders
    if (itemConfig?.[EnumSelectionType.Action]) {
      if (newActionItem.selectedActionItem)
        newActionItem.selectedActionItem.type = itemConfig.type || "";
      const actionConfig = itemConfig[EnumSelectionType.Action];
      // Extract the actual enum value from the nested structure
      const actionValue = actionConfig?.value?.value || actionConfig?.value;
      (newActionItem.selectedActionItem as any)[EnumSelectionType.Action] =
        actionValue;
    }

    let copy = { ...selectedRule };

    if (isEditMode && existingAction) {
      // Update existing action
      const updatedActions = [...(copy.actions || [])];
      updatedActions[lastActionIndex] = newActionItem;
      copy.actions = updatedActions;
    } else {
      // Add new action (initialize array if needed)
      const existingActions = copy.actions || [];

      // Check for duplicate actions using both type and configuration
      // Use the actual action type from itemConfig, not the template string
      const actionType =
        itemConfig.type ||
        newActionItem.type ||
        newActionItem.selectedActionItem?.type;

      console.log("[CARD BUTTON LOG] Checking for duplicates:", {
        actionType,
        itemConfigType: itemConfig.type,
        newActionItem,
        existingActions: existingActions.map((a) => ({
          type: a.type || a.selectedActionItem?.type,
          selectedActionItem: a.selectedActionItem,
        })),
      });

      const isDuplicate = existingActions.some((existingAction) => {
        const existingType =
          existingAction.type || existingAction.selectedActionItem?.type;

        console.log("[CARD BUTTON LOG] Comparing action:", {
          existingType,
          actionType,
          typesMatch: existingType === actionType,
        });

        if (!existingType || !actionType || existingType !== actionType) {
          return false;
        }

        // For AddRemoveLabel actions, also check the Add/Remove configuration
        if (actionType === ActionType.AddRemoveLabel) {
          const existingAddRemove =
            existingAction.selectedActionItem?.[EnumSelectionType.AddRemove];
          const newAddRemove =
            newActionItem.selectedActionItem?.[EnumSelectionType.AddRemove];
          const existingCardLabel =
            existingAction.selectedActionItem?.[EnumSelectionType.CardLabel];
          const newCardLabel =
            newActionItem.selectedActionItem?.[EnumSelectionType.CardLabel];

          console.log("[CARD BUTTON LOG] AddRemoveLabel comparison:", {
            existingAddRemove,
            newAddRemove,
            existingCardLabel,
            newCardLabel,
            isDuplicate:
              existingAddRemove === newAddRemove &&
              JSON.stringify(existingCardLabel) ===
                JSON.stringify(newCardLabel),
          });

          // Only consider duplicate if both Add/Remove action AND the target label are the same
          return (
            existingAddRemove === newAddRemove &&
            JSON.stringify(existingCardLabel) === JSON.stringify(newCardLabel)
          );
        }

        console.log(
          "[CARD BUTTON LOG] Other action type - comparing configurations"
        );
        // For other action types, compare their main configuration values
        const existingConfig = JSON.stringify(
          existingAction.selectedActionItem
        );
        const newConfig = JSON.stringify(newActionItem.selectedActionItem);

        console.log("[CARD BUTTON LOG] Configuration comparison:", {
          existingConfig,
          newConfig,
          isDuplicate: existingConfig === newConfig,
        });

        return existingConfig === newConfig;
      });

      if (!isDuplicate && actionType) {
        copy.actions = [...existingActions, newActionItem];
      }
    }

    setSelectedRule(copy);

    // Hide action selection after adding for better UX
    setConfiguringActionIndex(-1);
  };

  const onSaveAction = async () => {
    // Reset configuring state and proceed with save
    setConfiguringActionIndex(null);
    if (isEditMode && onSaveAndClose) {
      await onSaveAndClose(selectedRule);
    } else if (nextStep) {
      nextStep();
    }
  };

  const onCancelAction = () => {
    // Reset configuring state and revert changes if needed
    setConfiguringActionIndex(null);
    // Could add logic here to revert changes if needed
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Groups - hidden when configuringActionIndex is -1 */}
      {configuringActionIndex !== -1 && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Typography.Title
                  level={4}
                  className="text-gray-800 font-semibold"
                >
                  Select Action
                </Typography.Title>
                <Typography.Text className="text-gray-600">
                  Choose what happens when your trigger conditions are met
                </Typography.Text>
              </div>
              {isEditMode && (
                <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                  Edit Mode
                </div>
              )}
            </div>
          </div>

          {/* Action Groups */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
            {actionsData?.map((item: AutomationRuleAction, index: number) => (
              <div
                key={index}
                onClick={() => onActionTypeClick(item.type)}
                className={`group flex flex-col justify-center items-center rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedRule?.actions?.[lastActionIndex]?.type === item.type
                    ? "bg-white border-2 border-blue-400 shadow-sm"
                    : "bg-white border border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`mb-2 text-lg transition-colors duration-200 ${
                    selectedRule?.actions?.[lastActionIndex]?.type === item.type
                      ? "text-blue-600"
                      : "text-gray-600 group-hover:text-gray-700"
                  }`}
                >
                  {item?.icon}
                </div>
                <Typography.Text
                  className={`text-sm font-medium text-center transition-colors duration-200 ${
                    selectedRule?.actions?.[lastActionIndex]?.type === item.type
                      ? "text-blue-700"
                      : "text-gray-700 group-hover:text-gray-800"
                  }`}
                >
                  {item.label}
                </Typography.Text>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Action Items */}
      {configuringActionIndex !== -1 && (
        <div className="space-y-4">
          {actionsData[groupIndex]?.items?.map(
            (item: ActionItems, index: number) => (
              <div key={index}>
                <div
                  className={`group flex justify-between items-start rounded-xl p-6 transition-all duration-300 hover:shadow-lg ${
                    configuringActionIndex === index
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md"
                      : "bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 shadow-md border border-gray-200 hover:border-blue-200"
                  }`}
                >
                  <div className="flex-1">
                    {renderLabelWithSelects(
                      props,
                      item,
                      lastActionIndex,
                      groupIndex,
                      index,
                      modalOpenIndex === index,
                      (open: boolean) => setModalOpenIndex(open ? index : null)
                    )}
                  </div>
                  <div className="flex gap-3 ml-4">
                    {configuringActionIndex === index ? (
                      // Show Save/Cancel buttons when configuring this action
                      <>
                        <Button
                          shape="circle"
                          type="primary"
                          onClick={onSaveAction}
                          title="Save Action"
                          className="bg-gradient-to-r from-green-500 to-emerald-600 border-none hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                          size="large"
                        >
                          <Check size={18} />
                        </Button>
                        <Button
                          shape="circle"
                          onClick={onCancelAction}
                          title="Cancel"
                          className="bg-gradient-to-r from-red-500 to-rose-600 border-none hover:from-red-600 hover:to-rose-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                          size="large"
                        >
                          <X size={18} />
                        </Button>
                      </>
                    ) : (
                      // Show + button (disabled if another action is being configured)
                      <Button
                        shape="circle"
                        onClick={() => {
                          // Reset state to show action selection interface
                          setConfiguringActionIndex(null);
                          onAddAction(index);
                        }}
                        disabled={configuringActionIndex !== null}
                        title={
                          configuringActionIndex !== null
                            ? "Complete current action first"
                            : "Add Action"
                        }
                        className={`${
                          configuringActionIndex !== null
                            ? "bg-gray-300 border-gray-300 text-gray-500"
                            : "bg-gradient-to-r from-blue-500 to-indigo-600 border-none hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg"
                        } transition-all duration-200`}
                        size="large"
                      >
                        <Plus size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Display Added Actions */}
      {configuringActionIndex === -1 &&
        selectedRule.actions &&
        selectedRule.actions.length > 0 && (
          <div className="mb-6">
            <Typography.Title level={5} className="mb-4">
              Added Actions
            </Typography.Title>
            <div className="space-y-3">
              {selectedRule.actions.map((action: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="flex-1">
                    <Typography.Text className="text-gray-900">
                      {action.selectedActionItem?.type
                        ? renderRuleStateHuman(
                            action.selectedActionItem.type,
                            action.selectedActionItem
                          )
                        : action.selectedActionItem?.label ||
                          action.type ||
                          "Configured Action"}
                    </Typography.Text>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setLastActionIndex(index);
                        setConfiguringActionIndex(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() => {
                        const updatedActions =
                          selectedRule.actions?.filter((_, i) => i !== index) ||
                          [];
                        setSelectedRule({
                          ...selectedRule,
                          actions: updatedActions,
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Add Action Button - shown when interface is hidden */}
      {configuringActionIndex === -1 && (
        <div className="flex justify-center mt-6">
          <Button
            type="dashed"
            icon={<Plus size={18} />}
            onClick={() => setConfiguringActionIndex(null)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 border-none hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            size="large"
          >
            Add Action
          </Button>
        </div>
      )}
    </div>
  );
};

export default SelectAction;

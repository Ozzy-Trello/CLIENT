import { Button, Input, Select, Typography } from "antd";
import { actions } from "@constants/automation-rule/data";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
import { ListSelection, UserSelectionAutoComplete, SelectionRef } from "@components/selection";
import { EnumSelectionType } from "@myTypes/automation-rule";

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

  const options = data?.options?.map((optionItem: GeneralOptions) => ({
    value: optionItem.value,
    label: optionItem.label,
    option: optionItem,
  }));

  // Handle ListSelection change - use the actual placeholder as key
  const onListChange = (selectedOption: any, selectionName: string) => {
    console.log("ListSelection onChange called:", selectedOption);

    let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value =
      selectedOption;
    setActionsData(copyArr);
  };

  const onUserChange = (selectedOption: any, selectionName: string) => {
    console.log("UserSelection onChange called:", selectedOption);

    let copyArr = [...actionsData];
    (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value =
      selectedOption;
    setActionsData(copyArr);
  };

  // Handle regular Select change
  const onSelectChange = (
    selectedOption: GeneralOptions,
    selectionName: string
  ) => {
    // console.log("onSelectChange: value: %o", selectedOption);
    // console.log("onSelectChange: placeholder: %s", placeholder);
    // console.log("onSelectChange: actionsData: %o", actionsData);

    let copyArr = [...actionsData];

    // console.log("dats: %o", copyArr[groupIndex]?.items?.[index]);

    (copyArr[groupIndex]?.items?.[index]?.[placeholder] as any).value =
      selectedOption;
    setActionsData(copyArr);
  };

  if (placeholder === EnumSelectionType.User) {
    return (
    <UserSelectionAutoComplete
        width={"fit-content"}
        ref={userSelectionRef}
        value={
          (actionsData[groupIndex]?.items?.[index] as any)?.[placeholder]
            ?.value?.value || ""
        }
        onChange={(value, option) => {
          console.log("UserSelection onChange called:", option);
          onUserChange(option, placeholder);
        }}
        className="mx-2"
        key={`user-selection-${index}`}
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
            ?.value || ""
        }
        onChange={(value, option) => {
          console.log("di select nya: %o", option);
          onListChange(option, placeholder);
        }}
        className="mx-2"
        key={`list-selection-${index}`}
      />
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
    return <Typography.Text>{item.label}</Typography.Text>;
  }

  // Split the label by the placeholders
  const parts = item.label.split(/(<[^>]+>)/);

  return (
    <div className="flex items-center flex-wrap">
      {parts.map((part: string, indexPart: number) => {
        // Check if this part is a placeholder
        if (part.startsWith("<") && part.endsWith(">")) {
          const placeholder = part.trim().slice(1, -1); // Remove < and >

          // Handle text input
          if (
            placeholder === EnumSelectionType.TextInput &&
            item[placeholder]
          ) {
            const data = item[placeholder] as {
              placeholder?: string;
              value: string;
            };
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
        }

        // Regular text part
        return <span key={indexPart}>{part}</span>;
      })}
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
    console.log("masuk on add action", index);
    const newActionItem: SelectedAction = {
      groupType: actionsData[groupIndex].type,
      type: actionsData[groupIndex]?.items?.[index]?.type || "",
    };

    console.log(actionsData, "<< isi newaction");

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
        newActionItem.selectedActionItem[placeholder] =
          (items?.[index]?.[placeholder] as TriggerItemSelection).value || "";
      }
    });

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
            <div
              key={index}
              className="flex justify-between items-start rounded p-2 mb-2 bg-gray-200"
            >
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
          )
        )}
      </div>
    </div>
  );
};

export default SelectAction;

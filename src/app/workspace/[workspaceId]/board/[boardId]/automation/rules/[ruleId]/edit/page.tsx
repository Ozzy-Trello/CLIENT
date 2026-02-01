"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  message,
  Spin,
  Typography,
  Modal,
  Space,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import SelectAction from "../../new/select-action";
import { actions, triggers } from "@constants/automation-rule/data";
import {
  AutomationRule,
  AutomationRuleApiData,
  AutomationRuleActionApiData,
  TriggerItemSelection,
  AutomationRuleTrigger,
  AutomationRuleAction,
  SelectedCardFilterItem,
  SelectedAction,
  SelectedTriggerItem,
} from "@myTypes/type";
import SelectTrigger from "../../new/select-trigger";
import { extractPlaceholders } from "@utils/general";
import {
  getRuleById,
  updateRule,
  updateTrigger,
  updateTriggerOnly,
  updateAction,
  addAction,
  deleteAction,
  updateActionById,
  deleteActionById,
} from "@api/automation_rule";
import { EnumSelectionType, EnumInputType } from "@myTypes/automation-rule";
import { useCustomFields } from "@hooks/custom_field";
import { renderRulePatternHuman } from "@utils/rule-render";
import { useRuleLookups } from "@hooks/useRuleLookups";

const { Title, Text } = Typography;

export default function EditRulePage() {
  const router = useRouter();
  const { workspaceId, boardId, ruleId } = useParams();
  const [selectedRule, setSelectedRule] = useState<AutomationRule>({
    triggerType: triggers[0].type,
    actions: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingRule, setIsLoadingRule] = useState<boolean>(true);
  const [triggersData, setTriggersData] =
    useState<AutomationRuleTrigger[]>(triggers);
  const [actionsData, setActionsData] =
    useState<AutomationRuleAction[]>(actions);

  // Inline editing states
  const [isEditingTrigger, setIsEditingTrigger] = useState(false);
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(
    null
  );
  const [editingActionId, setEditingActionId] = useState<string | undefined>(
    undefined
  );

  const { customFields } = useCustomFields(workspaceId as string);
  const numberFields = customFields.filter((f) => f.type === "number");

  // Create rule-like objects for the lookup hook
  const ruleLikeObjects = React.useMemo(() => {
    if (!selectedRule || !selectedRule.triggerItem) return [];

    const ruleObj: any = {
      groupType: selectedRule.triggerType,
      type: selectedRule.triggerItem.type,
      condition: selectedRule.triggerItem || {},
      action:
        selectedRule.actions?.map((action) => {
          return {
            groupType: action.groupType,
            type: action.selectedActionItem?.type,
            condition: action.selectedActionItem || {},
          };
        }) || [],
      filter:
        selectedRule.triggerItem?.filter?.map((filter: any) => ({
          groupType: filter.groupType,
          type: filter.type,
          condition: filter || {},
        })) || [],
    };

    return [ruleObj];
  }, [selectedRule]);

  // Use the lookup hook to populate cache
  const { loading: lookupsLoading } = useRuleLookups(ruleLikeObjects);

  // Escape key to cancel editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isEditingTrigger) {
          setIsEditingTrigger(false);
        } else if (isEditingAction) {
          setIsEditingAction(false);
          setEditingActionIndex(null);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditingTrigger, isEditingAction]);

  // Function to load/refresh rule data
  const loadRule = async () => {
    try {
      setIsLoadingRule(true);
      const response = await getRuleById(
        workspaceId as string,
        ruleId as string
      );
      const ruleData = response.data;

      // Convert backend rule data to frontend format
      const convertedRule = convertBackendRuleToFrontend(ruleData);
      setSelectedRule(convertedRule);
    } catch (error) {
      console.error("Failed to load rule:", error);
      message.error("Failed to load rule data");
      router.push(
        `/workspace/${workspaceId}/board/${boardId}/automation/rules`
      );
    } finally {
      setIsLoadingRule(false);
    }
  };

  // Load existing rule data on component mount
  useEffect(() => {
    if (ruleId && workspaceId) {
      loadRule();
    }
  }, [ruleId, workspaceId, boardId, router]);

  const convertBackendRuleToFrontend = (
    ruleData: AutomationRuleApiData
  ): AutomationRule => {
    // Find the trigger type from the triggers data
    const triggerType = ruleData.groupType;

    // Handle both nested and flat condition structures
    // If condition.condition exists, use that (nested structure)
    // Otherwise use condition directly (flat structure)
    const actualCondition =
      (ruleData.condition as any)?.condition || ruleData.condition;

    const triggerItem: TriggerItemSelection = {
      type: ruleData.type,
      ...actualCondition,
    };

    // Convert filters
    if (ruleData.filter && ruleData.filter.length > 0) {
      const filters: SelectedCardFilterItem[] = ruleData.filter.map(
        (filter) => ({
          groupType: filter.groupType,
          type: filter.type,
          label: filter.type, // Use type as label for now, could be enhanced later
          ...filter.condition,
        })
      );
      triggerItem.filter = filters;
    }

    // Convert actions
    const convertedActions =
      ruleData.action?.map((action) => {
        return {
          id: action.id, // Include action ID for direct updates
          groupType: action.groupType,
          selectedActionItem: {
            type: action.type,
            ...action.condition,
          },
        };
      }) || [];

    const finalRule = {
      triggerType,
      triggerItem,
      actions: convertedActions,
    };

    return finalRule;
  };

  const onCancel = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
  };

  const saveRule = async () => {
    // Validate necessary data is present
    if (
      !selectedRule.triggerItem ||
      !selectedRule.actions ||
      selectedRule.actions.length === 0
    ) {
      console.error("Cannot save rule: missing trigger or actions");
      return;
    }

    const { actions, triggerItem, triggerType } = selectedRule;

    // Extract placeholders from trigger type
    const triggerPlaceholders = extractPlaceholders(triggerItem.type || "");

    // Build condition object for the trigger
    const triggerCondition: Record<string, any> = {};

    // For each placeholder in the trigger, add to condition
    triggerPlaceholders.forEach((placeholder) => {
      if (placeholder === "filter") {
        // Handle filter specially since it has a specific structure
        if (triggerItem.filter) {
          triggerCondition[placeholder] = triggerItem.filter;
        }
      } else if (placeholder in triggerItem) {
        // For dynamic properties that are GeneralOptions
        const value = triggerItem[placeholder];
        if (value) {
          if (typeof value === "object" && "value" in value) {
            if ("data" in value) {
              triggerCondition[placeholder] = {
                operator: (value as any).value,
                data: (value as any).data,
              };
            } else {
              triggerCondition[placeholder] = (value as any).value;
            }
          } else {
            triggerCondition[placeholder] = value;
          }
        }
      }
    });
    triggerCondition["board"] = boardId;
    triggerCondition["filter"] = undefined;

    // ensure constant action is included even if not in placeholders
    const actVal: any = (triggerItem as any)[EnumSelectionType.Action];
    if (actVal && !triggerCondition[EnumSelectionType.Action]) {
      if (typeof actVal === "object" && "value" in actVal) {
        triggerCondition[EnumSelectionType.Action] = actVal.value;
      } else {
        triggerCondition[EnumSelectionType.Action] = actVal;
      }
    }

    // === NEW: include checklist_name filter when provided ===
    if ((triggerItem as any)[EnumSelectionType.ChecklistName] !== undefined) {
      triggerCondition[EnumSelectionType.ChecklistName] = (triggerItem as any)[
        EnumSelectionType.ChecklistName
      ];
    }

    // Build filter array
    const newFilters: AutomationRuleActionApiData[] = [];
    // Process each filters
    triggerItem?.filter?.forEach((filter: SelectedCardFilterItem) => {
      if (!filter.type) return;

      // Extract placeholders from action type
      const filterPlaceholders = extractPlaceholders(filter.type || "");
      if (!filterPlaceholders.includes(EnumInputType.Text))
        filterPlaceholders.push(EnumInputType.Text);
      if (!filterPlaceholders.includes(EnumSelectionType.Completion))
        filterPlaceholders.push(EnumSelectionType.Completion);

      // Build condition object for this action
      const filterCondition: Record<string, any> = {};

      // For each placeholder in the action, add to condition
      filterPlaceholders.forEach((placeholder) => {
        if (filter?.[placeholder]) {
          const value = filter?.[placeholder];

          if (value && typeof value === "object" && "value" in value) {
            filterCondition[placeholder] = value.value;
          } else {
            filterCondition[placeholder] = value;
          }
        }
      });

      // Create filter object in the expected format
      const formattedFilter: AutomationRuleActionApiData = {
        groupType: filter?.groupType || "",
        type: filter?.type,
        condition: filterCondition,
      };

      newFilters.push(formattedFilter);
    });

    // Build actions array
    const newActions: AutomationRuleActionApiData[] = [];
    // Process each action
    actions.forEach((action) => {
      if (!action.selectedActionItem) return;

      // Extract placeholders from action type
      const actionPlaceholders = extractPlaceholders(
        action.selectedActionItem.type || ""
      );

      // Build condition object for this action
      const actionCondition: Record<string, any> = {};

      // For each placeholder in the action, add to condition
      actionPlaceholders.forEach((placeholder) => {
        if (
          action.selectedActionItem &&
          action.selectedActionItem[placeholder]
        ) {
          const value = action.selectedActionItem[placeholder];
          if (
            placeholder === EnumSelectionType.Fields ||
            placeholder === EnumInputType.FieldValue
          ) {
            // Keep the full option object so backend has label/type etc.
            actionCondition[placeholder] = value;
          } else if (
            placeholder === EnumInputType.DateValue &&
            (action.selectedActionItem.type ===
              "move-date-in-custom-field-<fields>-to-<date_value>" ||
              action.selectedActionItem.type ===
                "set-date-custom-field-<fields>-to-<date_value>")
          ) {
            // For MoveDateCustomField and SetDateCustomField, wrap expressions array in object
            actionCondition[placeholder] = { expressions: value };
          } else if (value && typeof value === "object" && "value" in value) {
            actionCondition[placeholder] = value.value;
          } else {
            actionCondition[placeholder] = value;
          }
        }
      });

      // Ensure constant action field is included even if not in placeholders
      if (
        action.selectedActionItem &&
        action.selectedActionItem[EnumSelectionType.Action] &&
        !actionCondition[EnumSelectionType.Action]
      ) {
        const actionValue = action.selectedActionItem[EnumSelectionType.Action];
        if (typeof actionValue === "object" && "value" in actionValue) {
          actionCondition[EnumSelectionType.Action] = actionValue.value;
        } else {
          actionCondition[EnumSelectionType.Action] = actionValue;
        }
      }

      // Create action object in the expected format
      const formattedAction: AutomationRuleActionApiData = {
        groupType: action?.groupType || "",
        type: action.selectedActionItem.type,
        condition: actionCondition,
      };

      newActions.push(formattedAction);
    });

    // Create final rule object
    const rule: AutomationRuleApiData = {
      workspaceId: Array.isArray(workspaceId)
        ? workspaceId[0]
        : (workspaceId as string),
      groupType: triggerType,
      type: triggerItem.type || "",
      condition: triggerCondition,
      filter: newFilters,
      action: newActions,
    };

    // Update rule
    try {
      setIsLoading(true);
      const result = await updateRule(
        workspaceId as string,
        ruleId as string,
        rule
      );
      message.success("Rule updated successfully");
      router.push(
        `/workspace/${workspaceId}/board/${boardId}/automation/rules`
      );
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Failed to update rule");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditTrigger = () => {
    setIsEditingTrigger(true);
    setIsEditingAction(false);
  };

  const openEditAction = (action: SelectedAction) => {
    // Find the index of this action in the array
    const index = selectedRule.actions?.findIndex(a => a.id === action.id) ?? -1;
    setEditingActionIndex(index);
    setEditingActionId(action.id); // Store the action ID
    setIsEditingAction(true);
    setIsEditingTrigger(false);
    
    // Initialize actionsData with the existing action's data
    const existingAction = action;
    if (existingAction) {
      // Find the action group that matches the existing action's type
      const actionGroup = actions.find(group => group.type === existingAction.type);
      if (actionGroup) {
        // Find the specific action item within the group
        const actionItem = actionGroup.items?.find(item => 
          item.type === existingAction.selectedActionItem?.type
        );
        
        if (actionItem) {
          // Create a copy of the action item and populate it with existing data
          const populatedActionItem = { ...actionItem };
          
          // Populate the form fields with existing action data
          if (existingAction.selectedActionItem) {
            Object.keys(existingAction.selectedActionItem).forEach(key => {
              if (key !== 'type' && key !== 'label') {
                populatedActionItem[key] = existingAction.selectedActionItem![key];
              }
            });
          }
          
          // Create the actionsData structure with the populated item
          const editActionsData = actions.map(group => {
            if (group.type === existingAction.type) {
              return {
                ...group,
                items: group.items?.map(item => 
                  item.type === existingAction.selectedActionItem?.type 
                    ? populatedActionItem 
                    : item
                ) || []
              };
            }
            return group;
          });
          
          setActionsData(editActionsData);
        }
      }
    }
  };

  const openAddAction = () => {
    setEditingActionIndex(null);
    setEditingActionId(undefined);
    setIsEditingAction(true);
    setIsEditingTrigger(false);
    // Reset actionsData to default state for adding new action
    setActionsData(actions);
  };

  const handleDeleteAction = async (index: number) => {
    if (!selectedRule.actions || selectedRule.actions.length <= 1) {
      message.error("Rule must have at least one action");
      return;
    }

    const action = selectedRule.actions[index];

    try {
      setIsLoading(true);

      // Use deleteActionById if action has an ID, otherwise use the index-based delete
      if (action.id) {
        await deleteActionById(workspaceId as string, action.id);
      } else {
        await deleteAction(
          workspaceId as string,
          ruleId as string,
          index,
          boardId as string
        );
      }

      // Update local state
      const updatedActions = selectedRule.actions.filter((_, i) => i !== index);
      const updatedRule = { ...selectedRule, actions: updatedActions };
      setSelectedRule(updatedRule);

      message.success("Action deleted successfully");
    } catch (e: any) {
      console.error("Failed to delete action:", e);
      message.error(e?.response?.data?.message || "Failed to delete action");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine group type from trigger type
  const getGroupTypeFromTriggerType = (triggerType: string): string => {
    // Custom fields triggers
    if (
      triggerType.includes("custom-field") ||
      triggerType.includes("custom-fields")
    ) {
      return "card.fields";
    }
    // Card move triggers
    else if (
      triggerType.includes("when-a-card") &&
      (triggerType.includes("added") ||
        triggerType.includes("moved") ||
        triggerType.includes("list"))
    ) {
      return "card.move";
    }
    // Checklist triggers
    else if (
      triggerType.includes("checklist") ||
      triggerType.includes("item")
    ) {
      return "card.checklists";
    }
    // Date triggers
    else if (triggerType.includes("date") || triggerType.includes("due")) {
      return "card.dates";
    }
    // Content triggers
    else if (
      triggerType.includes("content") ||
      triggerType.includes("title") ||
      triggerType.includes("description")
    ) {
      return "card.content";
    }
    // Card changes triggers (completion, archival, labels, attachments, members, butuh bahan)
    else if (
      triggerType.includes("completion") ||
      triggerType.includes("archive") ||
      triggerType.includes("label") ||
      triggerType.includes("attachment") ||
      triggerType.includes("member") ||
      triggerType.includes("butuh-bahan")
    ) {
      return "card.changes";
    }
    // Default fallback
    return "card.move";
  };

  const saveTriggerWithData = async (
    updatedTriggerItem: SelectedTriggerItem
  ) => {
    if (!updatedTriggerItem) {
      message.error("No trigger configured");
      return;
    }

    // Validate necessary data is present
    if (!selectedRule.actions || selectedRule.actions.length === 0) {
      message.error("Cannot save rule: missing actions");
      return;
    }

    try {
      setIsLoading(true);

      const { actions } = selectedRule;
      const triggerItem = updatedTriggerItem;
      const triggerType = getGroupTypeFromTriggerType(triggerItem.type || "");

      // Extract placeholders from trigger type
      const triggerPlaceholders = extractPlaceholders(triggerItem.type || "");

      // Build condition object for the trigger
      const triggerCondition: Record<string, any> = {};

      // For each placeholder in the trigger, add to condition
      triggerPlaceholders.forEach((placeholder) => {
        if (placeholder === "filter") {
          // Handle filter specially since it has a specific structure
          if (triggerItem.filter) {
            triggerCondition[placeholder] = triggerItem.filter;
          }
        } else if (placeholder in triggerItem) {
          // For dynamic properties that are GeneralOptions
          const value = triggerItem[placeholder];
          if (value) {
            if (typeof value === "object" && "value" in value) {
              if ("data" in value) {
                triggerCondition[placeholder] = {
                  operator: (value as any).value,
                  data: (value as any).data,
                };
              } else {
                triggerCondition[placeholder] = (value as any).value;
              }
            } else {
              triggerCondition[placeholder] = value;
            }
          }
        }
      });
      triggerCondition["board"] = boardId;
      triggerCondition["filter"] = undefined;

      // ensure constant action is included even if not in placeholders
      const actVal: any = (triggerItem as any)[EnumSelectionType.Action];
      if (actVal && !triggerCondition[EnumSelectionType.Action]) {
        if (typeof actVal === "object" && "value" in actVal) {
          triggerCondition[EnumSelectionType.Action] = actVal.value;
        } else {
          triggerCondition[EnumSelectionType.Action] = actVal;
        }
      }

      // === NEW: include checklist_name filter when provided ===
      if ((triggerItem as any)[EnumSelectionType.ChecklistName] !== undefined) {
        triggerCondition[EnumSelectionType.ChecklistName] = (triggerItem as any)[
          EnumSelectionType.ChecklistName
        ];
      }

      // Build filter array from the NEW trigger item (not old filters)
      const newFilters: AutomationRuleActionApiData[] = [];
      // Process each filters from the updated trigger item
      triggerItem?.filter?.forEach((filter: SelectedCardFilterItem) => {
        if (!filter.type) return;

        // Extract placeholders from filter type
        const filterPlaceholders = extractPlaceholders(filter.type || "");
        if (!filterPlaceholders.includes(EnumInputType.Text))
          filterPlaceholders.push(EnumInputType.Text);
        if (!filterPlaceholders.includes(EnumSelectionType.Completion))
          filterPlaceholders.push(EnumSelectionType.Completion);

        // Build condition object for this filter
        const filterCondition: Record<string, any> = {};

        // For each placeholder in the filter, add to condition
        filterPlaceholders.forEach((placeholder) => {
          if (filter?.[placeholder]) {
            const value = filter?.[placeholder];

            if (value && typeof value === "object" && "value" in value) {
              filterCondition[placeholder] = value.value;
            } else {
              filterCondition[placeholder] = value;
            }
          }
        });

        // Create filter object in the expected format
        const formattedFilter: AutomationRuleActionApiData = {
          groupType: filter?.groupType || "",
          type: filter?.type,
          condition: filterCondition,
        };

        newFilters.push(formattedFilter);
      });

      // Build actions array (keep existing actions)
      const newActions: AutomationRuleActionApiData[] = [];
      // Process each action
      actions.forEach((action) => {
        if (!action.selectedActionItem) return;

        // Extract placeholders from action type
        const actionPlaceholders = extractPlaceholders(
          action.selectedActionItem.type || ""
        );

        // Build condition object for this action
        const actionCondition: Record<string, any> = {};

        // For each placeholder in the action, add to condition
        actionPlaceholders.forEach((placeholder) => {
          if (
            action.selectedActionItem &&
            action.selectedActionItem[placeholder]
          ) {
            const value = action.selectedActionItem[placeholder];
            if (
              placeholder === EnumSelectionType.Fields ||
              placeholder === EnumInputType.FieldValue
            ) {
              // Keep the full option object so backend has label/type etc.
              actionCondition[placeholder] = value;
            } else if (
              placeholder === EnumInputType.DateValue &&
              (action.selectedActionItem.type ===
                "move-date-in-custom-field-<fields>-to-<date_value>" ||
                action.selectedActionItem.type ===
                  "set-date-custom-field-<fields>-to-<date_value>")
            ) {
              // For MoveDateCustomField and SetDateCustomField, wrap expressions array in object
              actionCondition[placeholder] = { expressions: value };
            } else if (value && typeof value === "object" && "value" in value) {
              actionCondition[placeholder] = value.value;
            } else {
              actionCondition[placeholder] = value;
            }
          }
        });

        // Ensure constant action field is included even if not in placeholders
        if (
          action.selectedActionItem &&
          action.selectedActionItem[EnumSelectionType.Action] &&
          !actionCondition[EnumSelectionType.Action]
        ) {
          const actionValue = action.selectedActionItem[EnumSelectionType.Action];
          if (typeof actionValue === "object" && "value" in actionValue) {
            actionCondition[EnumSelectionType.Action] = actionValue.value;
          } else {
            actionCondition[EnumSelectionType.Action] = actionValue;
          }
        }

        // Create action object in the expected format
        const formattedAction: AutomationRuleActionApiData = {
          groupType: action?.groupType || "",
          type: action.selectedActionItem.type,
          condition: actionCondition,
        };

        newActions.push(formattedAction);
      });

      // Create trigger-only update data (no actions)
      const triggerData = {
        condition: triggerCondition,
        type: triggerItem.type || "",
        group_type: triggerType,
      };

      // Update only the trigger, preserving existing actions
      await updateTriggerOnly(workspaceId as string, ruleId as string, triggerData);

      message.success("Trigger updated successfully (actions preserved)");
      // Refresh rule data to show updated trigger
      await loadRule();
    } catch (e: any) {
      console.error("Failed to update trigger:", e);
      message.error(e?.response?.data?.message || "Failed to update trigger");
    } finally {
      setIsLoading(false);
    }
  };

  const saveTrigger = async () => {
    if (!selectedRule.triggerItem) {
      message.error("No trigger configured");
      return;
    }

    try {
      setIsLoading(true);

      // Extract the proper condition format from triggerItem
      const triggerItem = selectedRule.triggerItem as any;
      let condition = {};

      // If triggerItem has a nested condition structure, extract the inner condition
      if (triggerItem.condition && typeof triggerItem.condition === "object") {
        const innerCondition = triggerItem.condition as any;

        // Build the proper condition format expected by the backend
        condition = {
          board: triggerItem.board || innerCondition.board,
          action:
            (innerCondition.action &&
              typeof innerCondition.action === "object" &&
              innerCondition.action.value) ||
            innerCondition.action ||
            "card.customfield.changed",
          fields:
            (innerCondition.fields &&
              typeof innerCondition.fields === "object" &&
              innerCondition.fields.value) ||
            innerCondition.fields,
          field_value: innerCondition.field_value,
          optional_by: {
            data:
              (innerCondition.optional_by && innerCondition.optional_by.data) ||
              [],
            operator:
              (innerCondition.optional_by &&
                (innerCondition.optional_by.value ||
                  innerCondition.optional_by.operator)) ||
              "by-anyone",
          },
        };
      } else {
        // If it's already in the correct format, use it directly
        condition = {
          board: triggerItem.board,
          action:
            (triggerItem.action &&
              typeof triggerItem.action === "object" &&
              triggerItem.action.value) ||
            triggerItem.action ||
            "card.customfield.changed",
          fields:
            (triggerItem.fields &&
              typeof triggerItem.fields === "object" &&
              triggerItem.fields.value) ||
            triggerItem.fields,
          field_value: triggerItem.field_value,
          optional_by: {
            data:
              (triggerItem.optional_by && triggerItem.optional_by.data) || [],
            operator:
              (triggerItem.optional_by &&
                (triggerItem.optional_by.value ||
                  triggerItem.optional_by.operator)) ||
              "by-anyone",
          },
        };
      }

      // Get the trigger type and determine the group type
      const triggerType = triggerItem.type;
      const groupType = getGroupTypeFromTriggerType(triggerType);

      // Send the complete trigger data including type and group_type
      const triggerData = {
        condition,
        type: triggerType,
        group_type: groupType,
      };

      await updateTrigger(workspaceId as string, ruleId as string, triggerData);

      message.success("Trigger updated successfully");
      // Refresh rule data to show updated trigger
      await loadRule();
    } catch (e: any) {
      console.error("Failed to update trigger:", e);
      message.error(e?.response?.data?.message || "Failed to update trigger");
    } finally {
      setIsLoading(false);
    }
  };

  const saveAction = async (actionIndex: number) => {
    if (!selectedRule.actions || !selectedRule.actions[actionIndex]) {
      message.error("No action configured");
      return;
    }

    try {
      setIsLoading(true);

      const action = selectedRule.actions[actionIndex];

      // Convert action data to API format (snake_case for backend)
      const actionData = {
        group_type: action.groupType,
        type: action.selectedActionItem?.type || "",
        condition: action.selectedActionItem || {},
      };

      // Use updateActionById if action has an ID, otherwise use the index-based update
      if (action.id) {
        await updateActionById(workspaceId as string, action.id, actionData);
      } else {
        await updateAction(
          workspaceId as string,
          ruleId as string,
          actionIndex,
          actionData,
          boardId as string
        );
      }

      message.success("Action updated successfully");
      
      // Update local state instead of reloading entire rule to preserve action positions
      setSelectedRule(prevRule => {
        const updatedRule = { ...prevRule };
        if (updatedRule.actions && actionIndex >= 0 && actionIndex < updatedRule.actions.length) {
          // Update the specific action while preserving its position and ID
          updatedRule.actions[actionIndex] = {
            ...updatedRule.actions[actionIndex],
            // Preserve existing data since this function doesn't modify the action content
          };
        }
        return updatedRule;
      });
    } catch (e: any) {
      console.error("Failed to update action:", e);
      message.error(e?.response?.data?.message || "Failed to update action");
    } finally {
      setIsLoading(false);
    }
  };

  const saveActionWithData = async (
    actionIndex: number,
    updatedAction: SelectedAction
  ) => {
    try {
      setIsLoading(true);

      // Convert action data to API format (snake_case for backend)
      const actionData = {
        group_type: updatedAction.groupType,
        type: updatedAction.selectedActionItem?.type || "",
        condition: updatedAction.selectedActionItem || {},
      };

      // Use updateActionById if action has an ID, otherwise use the index-based update
      if (updatedAction.id) {
        await updateActionById(
          workspaceId as string,
          updatedAction.id,
          actionData
        );
      } else {
        await updateAction(
          workspaceId as string,
          ruleId as string,
          actionIndex,
          actionData,
          boardId as string
        );
      }

      message.success("Action updated successfully");
      
      // Update local state instead of reloading entire rule to preserve action positions
      setSelectedRule(prevRule => {
        const updatedRule = { ...prevRule };
        if (updatedRule.actions && actionIndex >= 0 && actionIndex < updatedRule.actions.length) {
          // Update the specific action while preserving its position and ID
          updatedRule.actions[actionIndex] = {
            ...updatedRule.actions[actionIndex],
            ...updatedAction,
            // Ensure ID is preserved if it exists
            id: updatedRule.actions[actionIndex].id || updatedAction.id
          };
        }
        return updatedRule;
      });
    } catch (e: any) {
      console.error("Failed to update action:", e);
      message.error(e?.response?.data?.message || "Failed to update action");
    } finally {
      setIsLoading(false);
    }
  };

  const saveNewAction = async (newAction: any) => {
    try {
      setIsLoading(true);

      // Convert action data to API format (snake_case for backend)
      const actionData = {
        group_type: newAction.groupType,
        type: newAction.selectedActionItem?.type || "",
        condition: newAction.selectedActionItem || {},
      };

      await addAction(
        workspaceId as string,
        ruleId as string,
        actionData,
        boardId as string
      );

      message.success("Action added successfully");
      // Refresh rule data to show new action
      await loadRule();
    } catch (e: any) {
      console.error("Failed to add action:", e);
      message.error(e?.response?.data?.message || "Failed to add action");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTriggerDescription = () => {
    if (!selectedRule.triggerItem || !selectedRule.triggerItem.type) {
      return "No trigger configured";
    }

    try {
      // Use the existing renderRulePatternHuman function to format the description
      const description = renderRulePatternHuman(
        selectedRule.triggerItem.type,
        selectedRule.triggerItem
      );
      return (
        description ||
        `When ${selectedRule.triggerItem.type.replace(/-/g, " ")}`
      );
    } catch (error) {
      console.error("Error formatting trigger description:", error);
      return `When ${selectedRule.triggerItem.type.replace(/-/g, " ")}`;
    }
  };

  const formatActionDescription = (action: any, index: number) => {
    if (!action.selectedActionItem || !action.selectedActionItem.type) {
      return "No action configured";
    }

    try {
      // Use the existing renderRulePatternHuman function to format the description
      const description = renderRulePatternHuman(
        action.selectedActionItem.type,
        action.selectedActionItem
      );
      return description || action.selectedActionItem.type.replace(/-/g, " ");
    } catch (error) {
      console.error("Error formatting action description:", error);
      return action.selectedActionItem.type.replace(/-/g, " ");
    }
  };

  if (isLoadingRule) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onCancel}
              className="hover:bg-gray-100"
            >
              Back to Rules
            </Button>
            <div>
              <Title level={2} className="text-gray-900 mb-0">
                Edit Rule
              </Title>
            </div>
          </div>
        </div>

        {/* Rule Components */}
        <div className="space-y-6">
          {/* Trigger Section */}
          {!isEditingTrigger && (
            <Card className="shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="text-gray-900 mb-0">
                  Trigger
                </Title>
                <Button
                  icon={<EditOutlined />}
                  onClick={openEditTrigger}
                  type="primary"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Edit Trigger
                </Button>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <Text className="text-gray-800 leading-relaxed">
                    {formatTriggerDescription()}
                  </Text>
                </div>
              </div>
            </Card>
          )}

          {/* Inline Trigger Editing */}
          {isEditingTrigger && (
            <Card className="shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="text-gray-900 mb-0">
                  Edit Trigger
                </Title>
                <Button
                  onClick={() => {
                    setIsEditingTrigger(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
              <SelectTrigger
                nextStep={() => {}}
                prevStep={() => {}}
                selectedRule={selectedRule}
                setSelectedRule={setSelectedRule}
                triggersData={triggersData}
                setTriggersData={setTriggersData}
                isEditMode={true}
                onSaveAndClose={async (updatedRule: AutomationRule) => {
                  if (updatedRule.triggerItem) {
                    await saveTriggerWithData(updatedRule.triggerItem);
                  }
                  setIsEditingTrigger(false);
                }}
              />
            </Card>
          )}

          {/* Actions Section */}
          {!isEditingAction && (
            <Card className="shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <Title level={4} className="text-gray-900 mb-0">
                  Actions
                </Title>
                <Button
                  icon={<PlusOutlined />}
                  onClick={openAddAction}
                  type="primary"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Action
                </Button>
              </div>
              <div className="space-y-3">
                {(selectedRule.actions || []).map((action, index) => (
                  <div
                    key={index}
                    className="bg-green-50 border border-green-200 p-4 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <Text className="text-gray-800 leading-relaxed">
                          {index + 1}. {formatActionDescription(action, index)}
                        </Text>
                      </div>
                      <Space>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            openEditAction(action);
                          }}
                          className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                        >
                          Edit
                        </Button>
                        {(selectedRule.actions?.length || 0) > 1 && (
                          <Button
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteAction(index)}
                            className="bg-red-600 text-white hover:bg-red-700 border-red-600"
                            loading={isLoading}
                          >
                            Delete
                          </Button>
                        )}
                      </Space>
                    </div>
                  </div>
                ))}
                {(!selectedRule.actions ||
                  selectedRule.actions.length === 0) && (
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                    <Text className="text-gray-500">No actions configured</Text>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Inline Action Editing */}
        {isEditingAction && (
          <Card className="shadow-sm border border-green-300 bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} className="text-green-900 mb-0">
                {editingActionIndex !== null ? "Edit Action" : "Add Action"}
              </Title>
              <Button
                onClick={() => {
                  setIsEditingAction(false);
                  setEditingActionIndex(null);
                }}
              >
                Cancel
              </Button>
            </div>
            <SelectAction
              nextStep={() => {}}
              prevStep={() => {}}
              selectedRule={selectedRule}
              setSelectedRule={setSelectedRule}
              actionsData={actionsData}
              setActionsData={setActionsData}
              numberFields={numberFields}
              isEditMode={editingActionIndex !== null}
              editingActionIndex={editingActionIndex}
              onSaveAndClose={async (updatedRule: AutomationRule) => {
                if (editingActionIndex !== null && editingActionId) {
                  // Edit mode - update existing action with updated data
                  const updatedAction =
                    updatedRule.actions?.[editingActionIndex];
                  if (updatedAction) {
                    await saveActionWithData(editingActionIndex, updatedAction);
                  }
                } else {
                  // Add mode - add new action
                  const newAction =
                    updatedRule.actions?.[updatedRule.actions.length - 1];
                  if (newAction) {
                    await saveNewAction(newAction);
                  }
                }
                setIsEditingAction(false);
                setEditingActionIndex(null);
                setEditingActionId(undefined);
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

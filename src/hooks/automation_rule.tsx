// import { useRouter } from "next/router";
// import { useState } from "react";
// import { AutomationRule, PostAutomationRule } from "../types/type";

// /**
//  * Main hook for automation rule management@/app/hooks/automation_rule
//  */
// export const useAutomationRule = (workspaceId: string, boardId?: string) => {
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const [rules, setRules] = useState<any[]>([]);
//   const router = useRouter();

//   /**
//    * Converts UI rule object to API format
//    */
//   const convertRuleToApiFormat = (selectedRule: AutomationRule): PostAutomationRule => {
//     if (!selectedRule.triggerItem || !selectedRule.actions || selectedRule.actions.length === 0) {
//       throw new Error("Cannot save rule: missing trigger or actions");
//     }

//     const { actions, triggerItem, triggerType } = selectedRule;
    
//     // Helper function to extract placeholders from a string
//     const extractPlaceholders = (pattern: string): string[] => {
//       const regex = /<([^>]+)>/g;
//       const placeholders: string[] = [];
      
//       let match;
//       while ((match = regex.exec(pattern)) !== null) {
//         placeholders.push(match[1]);
//       }
      
//       return placeholders;
//     };
    
//     // Build condition object for the trigger
//     const triggerPlaceholders = extractPlaceholders(triggerItem.type || '');
//     const triggerCondition: Record<string, any> = {};
    
//     // For each placeholder in the trigger, add to condition
//     triggerPlaceholders.forEach((placeholder) => {
//       if (placeholder === 'filter') {
//         // Handle filter specially since it has a specific structure
//         if (triggerItem.filter) {
//           triggerCondition[placeholder] = triggerItem.filter;
//         }
//       } else if (placeholder in triggerItem) {
//         // For dynamic properties that are GeneralOptions
//         const value = triggerItem[placeholder];
//         if (value && typeof value === 'object' && 'value' in value) {
//           triggerCondition[placeholder] = value.value;
//         } else {
//           triggerCondition[placeholder] = value;
//         }
//       }
//     });

//     // Build actions array
//     const newActions: any[] = [];
    
//     // Process each action
//     actions.forEach((action) => {
//       if (!action.selectedActionItem) return;
      
//       // Extract placeholders from action type
//       const actionPlaceholders = extractPlaceholders(action.selectedActionItem.type || '');
      
//       // Build condition object for this action
//       const actionCondition: Record<string, any> = {};
      
//       // For each placeholder in the action, add to condition
//       actionPlaceholders.forEach((placeholder) => {
//         if (action.selectedActionItem && placeholder in action.selectedActionItem) {
//           const value = action.selectedActionItem[placeholder];
//           if (value && typeof value === 'object' && 'value' in value) {
//             actionCondition[placeholder] = value.value;
//           } else {
//             actionCondition[placeholder] = value;
//           }
//         }
//       });
      
//       // Create action object in the expected format
//       const formattedAction = {
//         groupType: action.type || '',
//         type: action.selectedActionItem.type,
//         condition: actionCondition
//       };
      
//       newActions.push(formattedAction);
//     });

//     // Create final rule object
//     return {
//       workspaceId: workspaceId,
//       groupType: triggerType,
//       type: triggerItem.type || '',
//       condition: triggerCondition,
//       action: newActions
//     };
//   };

//   /**
//    * Save a new automation rule
//    */
//   const saveRule = async (selectedRule: AutomationRule) => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       const apiRule = convertRuleToApiFormat(selectedRule);
//       const response = await createRule(apiRule);
      
//       if (response.success) {
//         notification.success({
//           message: 'Rule Created',
//           description: 'The automation rule was created successfully.'
//         });
        
//         // Navigate back to the rules list if boardId is available
//         if (boardId) {
//           router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
//         }
        
//         return response.data;
//       } else {
//         throw new Error(response.message || 'Failed to create rule');
//       }
//     } catch (err: any) {
//       const errorMessage = err.message || 'An error occurred while saving the rule';
//       setError(errorMessage);
      
//       // notification.error({
//       //   message: 'Error',
//       //   description: errorMessage
//       // });
      
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   /**
//    * Load all automation rules for a workspace
//    */
//   const loadRules = async () => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       const response = await getRules(workspaceId);
      
//       if (response.success && response.data) {
//         setRules(response.data);
//         return response.data;
//       } else {
//         throw new Error(response.message || 'Failed to load rules');
//       }
//     } catch (err: any) {
//       const errorMessage = err.message || 'An error occurred while loading rules';
//       setError(errorMessage);
      
//       notification.error({
//         message: 'Error',
//         description: errorMessage
//       });
      
//       return [];
//     } finally {
//       setLoading(false);
//     }
//   };

//   /**
//    * Delete an automation rule
//    */
//   const removeRule = async (ruleId: string) => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       const response = await deleteRule(workspaceId, ruleId);
      
//       if (response.success) {
//         notification.success({
//           message: 'Rule Deleted',
//           description: 'The automation rule was deleted successfully.'
//         });
        
//         // Refresh the rules list
//         await loadRules();
        
//         return true;
//       } else {
//         throw new Error(response.message || 'Failed to delete rule');
//       }
//     } catch (err: any) {
//       const errorMessage = err.message || 'An error occurred while deleting the rule';
//       setError(errorMessage);
      
//       notification.error({
//         message: 'Error',
//         description: errorMessage
//       });
      
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     loading,
//     error,
//     rules,
//     saveRule,
//     loadRules,
//     removeRule,
//     convertRuleToApiFormat
//   };
// };

// export default useAutomationRule;
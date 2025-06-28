import {
  AlignJustify,
  ArrowDownNarrowWide,
  Bell,
  Check,
  Clock,
  MessageSquare,
  Minus,
  MoveRight,
  Plus,
  User,
  Hash,
} from "lucide-react";
import {
  AutomationRuleAction,
  AutomationRuleTrigger,
  TriggerItemSelection,
} from "@myTypes/type";
import { EnumActions, EnumUserActionEvent } from "@myTypes/event";
import {
  TriggerGroupType,
  ActionGroupType,
  EnumSelectionType,
  EnumTriggerCardFilterGroupType,
  TriggerType,
  ActionType,
  EnumTextType,
  EnumInputType,
} from "@myTypes/automation-rule";
import {
  EnumOptionArticleType,
  EnumOptionCardMarking,
  EnumOptionPosition,
  EnumOptionsNumberComparisonOperators,
  EnumOptionsSet,
  EnumOptionBySubject,
  EnumInclusionOperator,
  EnumTimeUnit,
  EnumRelativeDirection,
  EnumOptionCheckboxState,
  EnumOptionTextComparisonOperator,
  EnumOptionSubject,
} from "@myTypes/options";

// The constants used to contruct the UI
export const triggers: AutomationRuleTrigger[] = [
  {
    type: TriggerGroupType.CardMove,
    label: "Card Move",
    icon: <MoveRight />,
    items: [
      {
        type: TriggerType.WhenACardActionOverBoard,
        label: TriggerType.WhenACardActionOverBoard.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardAddedTo,
              label: "Added to",
            },
            {
              value: EnumUserActionEvent.CreatedIn,
              label: "Created in",
            },
            {
              value: EnumUserActionEvent.CardMovedInto,
              label: "Moved into",
            },
            {
              value: EnumUserActionEvent.CardMovedOutOf,
              label: "Moved out of",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardAddedTo,
            label: "Added to",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
        [EnumSelectionType.OptionalBoard]: {
          options: [],
          value: null,
        },
      },
      {
        type: TriggerType.WhenACardActionOverList,
        label: TriggerType.WhenACardActionOverList.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardAddedTo,
              label: "Added to",
            },
            {
              value: EnumUserActionEvent.CreatedIn,
              label: "Created in",
            },
            {
              value: EnumUserActionEvent.CardMovedInto,
              label: "Moved into",
            },
            {
              value: EnumUserActionEvent.CardMovedOutOf,
              label: "Moved out of",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardAddedTo,
            label: "Added to",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null,
        },
      },
      {
        type: TriggerType.WhenACardHasArchivalAction,
        label: TriggerType.WhenACardHasArchivalAction.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardArchived,
              label: "Archived",
            },
            {
              value: EnumUserActionEvent.CardUnarchived,
              label: "Unarchived",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardArchived,
            label: "Archived",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null,
        },
      },
      {
        type: TriggerType.WhenAListIsAction,
        label: TriggerType.WhenAListIsAction.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.ListCreated,
              label: "Created",
            },
            {
              value: EnumUserActionEvent.ListRenamed,
              label: "Renamed",
            },
            {
              value: EnumUserActionEvent.ListArchived,
              label: "Archived",
            },
            {
              value: EnumUserActionEvent.ListUnarchived,
              label: "Unarchived",
            },
          ],
          value: {
            value: EnumUserActionEvent.ListCreated,
            label: "Created",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenListHasCards,
        label: TriggerType.WhenListHasCards.replaceAll("-", " "),
        [EnumSelectionType.NumberComparison]: {
          options: [
            {
              value: EnumOptionsNumberComparisonOperators.Exactly,
              label: "exactly",
            },
            {
              value: EnumOptionsNumberComparisonOperators.FewerThan,
              label: "fewer than",
            },
            {
              value: EnumOptionsNumberComparisonOperators.MoreThan,
              label: "more than",
            },
          ],
          value: {
            value: EnumOptionsNumberComparisonOperators.Exactly,
            label: "exactly",
          },
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null,
        },
        [EnumInputType.Number]: null,
      },
    ],
  },
  {
    type: TriggerGroupType.CardChanges,
    label: "Card Changes",
    icon: (
      <div className="flex gap-1">
        {" "}
        <Plus /> <Minus />{" "}
      </div>
    ),
    items: [
      {
        type: TriggerType.WhenCardCompletionChanges,
        label: TriggerType.WhenCardCompletionChanges.replaceAll("-", " "),
        [EnumSelectionType.Marked]: {
          options: [
            {
              value: EnumOptionCardMarking.Complete,
              label: "Complete",
            },
            {
              value: EnumOptionCardMarking.Incomplete,
              label: "Incomplete",
            },
          ],
          value: {
            value: EnumOptionCardMarking.Complete,
            label: "Complete",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCardLabelChanges,
        label: TriggerType.WhenCardLabelChanges.replaceAll("-", " "),
        [EnumSelectionType.ArticleType]: {
          options: [
            {
              value: EnumOptionArticleType.The,
              label: "The",
            },
            {
              value: EnumOptionArticleType.Any,
              label: "Any",
            },
          ],
          value: {
            value: EnumOptionArticleType.The,
            label: "The",
          },
        },
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardLabelAdded,
              label: "added to",
            },
            {
              value: EnumUserActionEvent.CardLabelRemove,
              label: "removed from",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardLabelAdded,
            label: "added to",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCardAttachmentChanges,
        label: TriggerType.WhenCardAttachmentChanges.replaceAll("-", " "),
        [EnumSelectionType.TextComparison]: {
          options: [
            {
              value: EnumOptionTextComparisonOperator.StartingWith,
              label: "starting with",
            },
            {
              value: EnumOptionTextComparisonOperator.EndingWith,
              label: "ending with",
            },
            {
              value: EnumOptionTextComparisonOperator.NotContaining,
              label: "not containing",
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
              value: EnumOptionTextComparisonOperator.Containing,
              label: "containing",
            },
          ],
          value: {
            value: EnumOptionTextComparisonOperator.StartingWith,
            label: "starting with",
          },
        },
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardLabelAdded,
              label: "added to",
            },
            {
              value: EnumUserActionEvent.CardLabelRemove,
              label: "removed from",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardLabelAdded,
            label: "added to",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCardMemberChanges,
        label: TriggerType.WhenCardMemberChanges.replaceAll("-", " "),
        [EnumSelectionType.Subject]: {
          options: [
            {
              value: EnumOptionSubject.Iam,
              label: "I am",
            },
            {
              value: EnumOptionSubject.SomeoneIs,
              label: "Someone is",
            },
          ],
          value: {
            value: EnumOptionSubject.Iam,
            label: "I am",
          },
        },
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardLabelAdded,
              label: "added to",
            },
            {
              value: EnumUserActionEvent.CardLabelRemove,
              label: "removed from",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardLabelAdded,
            label: "added to",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
    ],
  },
  {
    type: TriggerGroupType.CardDates,
    label: "Dates",
    icon: <Clock />,
  },
  {
    type: TriggerGroupType.CardChecklist,
    label: "Checklists",
    icon: <Check />,
    items: [
      {
        type: TriggerType.WhenChecklistIsAction,
        label: TriggerType.WhenChecklistIsAction.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: "checklist.added", // temporary string action
              label: "added to",
            },
            {
              value: "checklist.removed",
              label: "removed from",
            },
          ],
          value: {
            value: "checklist.added",
            label: "added to",
          },
        },
        [EnumInputType.Text]: "", // checklist name input
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            { value: EnumOptionBySubject.ByMe, label: "by me" },
            { value: EnumOptionBySubject.ByAnyone, label: "by anyone" },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: { value: EnumOptionBySubject.ByMe, label: "by me" },
          data: [],
        },
      },
      {
        type: TriggerType.WhenChecklistCompletionChanges,
        label: TriggerType.WhenChecklistCompletionChanges.replaceAll("-", " "),
        [EnumSelectionType.ChecklistScope]: {
          options: [
            { value: "checklist", label: "checklist" },
            { value: "a-checklist", label: "a checklist" },
            { value: "all-checklists", label: "all checklists" },
          ],
          value: { value: "checklist", label: "checklist" },
        },
        [EnumInputType.Text]: "", // checklist name (used only when checklist scope is 'checklist')
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.ChecklistCompleted,
              label: "completed",
            },
            {
              value: EnumUserActionEvent.ChecklistIncompleted,
              label: "made incomplete",
            },
          ],
          value: {
            value: EnumUserActionEvent.ChecklistCompleted,
            label: "completed",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            { value: EnumOptionBySubject.ByMe, label: "by me" },
            { value: EnumOptionBySubject.ByAnyone, label: "by anyone" },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: { value: EnumOptionBySubject.ByMe, label: "by me" },
          data: [],
        },
      },
      {
        type: TriggerType.WhenChecklistItemStateChanges,
        label: TriggerType.WhenChecklistItemStateChanges.replaceAll("-", " "),
        [EnumSelectionType.ItemScope]: {
          options: [
            { value: "the", label: "the" },
            { value: "an", label: "an" },
          ],
          value: { value: "the", label: "the" },
        },
        [EnumInputType.Text]: "", // item name
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.ChecklistItemChecked,
              label: "checked",
            },
            {
              value: EnumUserActionEvent.ChecklistItemUnchecked,
              label: "unchecked",
            },
          ],
          value: {
            value: EnumUserActionEvent.ChecklistItemChecked,
            label: "checked",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            { value: EnumOptionBySubject.ByMe, label: "by me" },
            { value: EnumOptionBySubject.ByAnyone, label: "by anyone" },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: { value: EnumOptionBySubject.ByMe, label: "by me" },
          data: [],
        },
      },
      {
        type: TriggerType.WhenChecklistItemDueDateChanges,
        label: TriggerType.WhenChecklistItemDueDateChanges.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.ChecklistItemDueDateSet,
              label: "set on",
            },
            {
              value: EnumUserActionEvent.ChecklistItemDueDateRemoved,
              label: "removed from",
            },
          ],
          value: {
            value: EnumUserActionEvent.ChecklistItemDueDateSet,
            label: "set on",
          },
        },
        [EnumSelectionType.DateExpression]: {
          options: [],
          value: null,
        },
      },
      {
        type: TriggerType.WhenChecklistItemIsAddedTo,
        label: TriggerType.WhenChecklistItemIsAddedTo.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.ChecklistItemAdded,
              label: "added to",
            },
            {
              value: EnumUserActionEvent.ChecklistItemRemoved,
              label: "removed from",
            },
          ],
          value: {
            value: EnumUserActionEvent.ChecklistItemAdded,
            label: "added to",
          },
        },
        [EnumSelectionType.ChecklistScope]: {
          options: [
            { value: "checklist", label: "checklist" },
            { value: "a-checklist", label: "a checklist" },
          ],
          value: { value: "a-checklist", label: "a checklist" },
        },
        [EnumInputType.Text]: "", // checklist name (used only when checklist scope is 'checklist')
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            { value: EnumOptionBySubject.ByMe, label: "by me" },
            { value: EnumOptionBySubject.ByAnyone, label: "by anyone" },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: { value: EnumOptionBySubject.ByMe, label: "by me" },
          data: [],
        },
        [EnumSelectionType.TextComparison]: {
          options: [
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
          ],
          value: {
            value: EnumOptionTextComparisonOperator.StartingWith,
            label: "starting with",
          },
        },
      },
    ],
  },
  {
    type: TriggerGroupType.CardContent,
    label: "Card Content",
    icon: <MessageSquare />,
    items: [],
  },
  {
    type: TriggerGroupType.CardFields,
    label: "Fields",
    icon: <AlignJustify />,
    items: [
      {
        type: TriggerType.WhenAllCustomFieldsAreCompleted,
        label: TriggerType.WhenAllCustomFieldsAreCompleted.replaceAll("-", " "),
      },
      {
        type: TriggerType.WhenCustomFieldsAreCompleted,
        label: TriggerType.WhenCustomFieldsAreCompleted.replaceAll("-", " "),
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
      },
      {
        type: TriggerType.WhenCustomFieldsIsSetToFieldValue,
        label: TriggerType.WhenCustomFieldsIsSetToFieldValue.replaceAll(
          "-",
          " "
        ),
        [EnumSelectionType.Action]: {
          options: [],
          value: {
            value: EnumUserActionEvent.CardCustomFieldChange,
            label: EnumUserActionEvent.CardCustomFieldChange,
          },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
        [EnumInputType.FieldValue]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCustomFieldsIsSet,
        label: TriggerType.WhenCustomFieldsIsSet.replaceAll("-", " "),
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardCustomFieldChange,
              label: "set",
            },
            {
              value: EnumOptionsSet.Cleared,
              label: "cleared",
            },
          ],
          value: {
            value: EnumUserActionEvent.CardCustomFieldChange,
            label: "set",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCustomFieldIsChecked,
        label: TriggerType.WhenCustomFieldIsChecked.replaceAll("-", " "),
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: ["checkbox"],
        },
        [EnumSelectionType.Action]: {
          options: [],
          value: {
            value: EnumUserActionEvent.CardCustomFieldChange,
            label: EnumUserActionEvent.CardCustomFieldChange,
          },
        },
        [EnumSelectionType.State]: {
          options: [
            {
              value: EnumOptionCheckboxState.Checked,
              label: "checked",
            },
            {
              value: EnumOptionCheckboxState.Unchecked,
              label: "unchecked",
            },
          ],
          value: {
            value: EnumOptionCheckboxState.Checked,
            label: "checked",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCustomFieldNumberComparison,
        label: TriggerType.WhenCustomFieldNumberComparison.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [],
          value: {
            value: EnumUserActionEvent.CardCustomFieldChange,
            label: EnumUserActionEvent.CardCustomFieldChange,
          },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: ["number"],
        },
        [EnumSelectionType.NumberComparison]: {
          options: [
            {
              value: EnumOptionsNumberComparisonOperators.MoreThan,
              label: "greater than",
            },
            {
              value: EnumOptionsNumberComparisonOperators.MoreOrEqual,
              label: "greater or equal to",
            },
            {
              value: EnumOptionsNumberComparisonOperators.FewerThan,
              label: "lower than",
            },
            {
              value: EnumOptionsNumberComparisonOperators.FewerOrEqual,
              label: "lower or equal to",
            },
          ],
          value: {
            value: EnumOptionsNumberComparisonOperators.MoreThan,
            label: "greater than",
          },
        },
        [EnumInputType.Number]: null,
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionBySubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionBySubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionBySubject.ByMe,
            label: "by me",
          },
          data: [],
        },
      },
      {
        type: TriggerType.WhenCustomFieldDateCondition,
        label: TriggerType.WhenCustomFieldDateCondition.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [],
          value: {
            value: EnumUserActionEvent.CardCustomFieldChange,
            label: EnumUserActionEvent.CardCustomFieldChange,
          },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: ["date"],
        },
        [EnumSelectionType.DateExpression]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            { value: EnumOptionBySubject.ByMe, label: "by me" },
            { value: EnumOptionBySubject.ByAnyone, label: "by anyone" },
            {
              value: EnumOptionBySubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionBySubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: { value: EnumOptionBySubject.ByMe, label: "by me" },
          data: [],
        },
      },
    ],
  } as AutomationRuleTrigger,
];

export const actions: AutomationRuleAction[] = [
  {
    type: ActionGroupType.CardMove,
    label: "Move",
    icon: <MoveRight />,
    items: [
      {
        type: ActionType.ActionTheCardToPositionInSpecificList,
        label: ActionType.ActionTheCardToPositionInSpecificList.replaceAll(
          "-",
          " "
        ),
        [EnumSelectionType.Position]: {
          options: [
            {
              value: EnumOptionPosition.TopOfList,
              label: "The top of the list",
            },
            {
              value: EnumOptionPosition.BottomOfList,
              label: "The bottom of the list",
            },
            {
              value: EnumOptionPosition.NextList,
              label: "next list on the board",
            },
            {
              value: EnumOptionPosition.PreviousList,
              label: "previous_list_on_the_board",
            },
          ],
          value: {
            value: EnumOptionPosition.TopOfList,
            label: "The top of the list",
          },
        },
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.MoveCard,
              label: "Move",
            },
            {
              value: EnumActions.CopyCard,
              label: "Copy",
            },
          ],
          value: {
            value: EnumActions.MoveCard,
            label: "Move",
          },
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null,
        },
      },
      {
        type: ActionType.ActionTheCardToPosition,
        label: ActionType.ActionTheCardToPosition.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.MoveCard,
              label: "Move",
            },
          ],
          value: {
            value: EnumActions.MoveCard,
            label: "Move",
          },
        },
        [EnumSelectionType.Position]: {
          options: [
            {
              value: EnumOptionPosition.TopOfList,
              label: "The top of the list",
            },
            {
              value: EnumOptionPosition.BottomOfList,
              label: "The bottom of the list",
            },
          ],
          value: {
            value: EnumOptionPosition.TopOfList,
            label: "The top of the list",
          },
        },
      },
      {
        type: ActionType.ArchivalActionTheCard,
        label: ActionType.ArchivalActionTheCard.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.ArchiveCard,
              label: "archived",
            },
            {
              value: EnumActions.UnarchiveCard,
              label: "unarchived",
            },
          ],
          value: {
            value: EnumActions.ArchiveCard,
            label: "archived",
          },
        },
      },
    ],
  },
  {
    type: "card_add_remove",
    label: "Add/Remove",
    icon: (
      <div className="flex gap-1">
        {" "}
        <Plus /> <Minus />{" "}
      </div>
    ),
  },
  {
    type: "card_dates",
    label: "Dates",
    icon: <Clock />,
  },
  {
    type: "checklists",
    label: "Checklists",
    icon: <Check />,
  },
  {
    type: "members",
    label: "Members",
    icon: <User />,
  },
  {
    type: "card_content",
    label: "Card Content",
    icon: <MessageSquare />,
    items: [
      {
        type: ActionType.RenameCard,
        label: "rename the card to <text_input>",
        [EnumSelectionType.Action]: {
          options: [{ value: EnumActions.RenameCard, label: "rename" }],
          value: { value: EnumActions.RenameCard, label: "rename" },
        },
        [EnumSelectionType.TextInput]: {
          placeholder: "New card title",
          value: "",
        },
      },
      {
        type: ActionType.SetCardDescription,
        label: "set the card's description to <text_input>",
        [EnumSelectionType.Action]: {
          options: [
            { value: EnumActions.SetCardDescription, label: "set description" },
          ],
          value: {
            value: EnumActions.SetCardDescription,
            label: "set description",
          },
        },
        [EnumSelectionType.TextInput]: {
          placeholder: "Card description",
          value: "",
          isRichText: true, // Special flag to indicate this should use rich text editor
        },
      },
    ],
  },
  {
    type: "fields",
    label: "Fields",
    icon: <AlignJustify />,
    items: [
      {
        type: ActionType.ClearCustomField,
        label: "Clear custom field <fields>",
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.ClearCustomField,
              label: "Clear",
            },
          ],
          value: {
            value: EnumActions.ClearCustomField,
            label: "Clear",
          },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
      },
      {
        type: ActionType.SetCustomField,
        label: "Set custom field <fields> to <field_value>",
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.SetCustomField,
              label: "Set",
            },
          ],
          value: {
            value: EnumActions.SetCustomField,
            label: "Set",
          },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
        [EnumInputType.FieldValue]: {
          options: [],
          value: null,
        },
      },
      {
        type: ActionType.CheckCustomField,
        label: "<action> custom field <fields>",
        [EnumSelectionType.Action]: {
          options: [
            { value: EnumActions.CheckCustomField, label: "check" },
            { value: EnumActions.UncheckCustomField, label: "uncheck" },
          ],
          value: { value: EnumActions.CheckCustomField, label: "check" },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: "checkbox",
        },
      },
      {
        type: ActionType.IncrementCustomField,
        label: "<action> the number in custom field <fields> by [number]",
        [EnumSelectionType.Action]: {
          options: [
            { value: EnumActions.IncreaseNumberCustomField, label: "increase" },
            { value: EnumActions.DecreaseNumberCustomField, label: "decrease" },
          ],
          value: {
            value: EnumActions.IncreaseNumberCustomField,
            label: "increase",
          },
        },
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: "number",
        },
        [EnumInputType.Number]: "1",
      },
      {
        type: ActionType.SetDateCustomField,
        label: "set date custom field <fields> to <date_value>",
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: "date",
        },
        [EnumInputType.DateValue]: {
          options: [
            { value: "now", label: "now" },
            { value: "today", label: "today" },
            { value: "tomorrow", label: "tomorrow" },
            { value: "yesterday", label: "yesterday" },
            { value: "next_working_day", label: "the next working day" },
            {
              value: "the_previous_working_day",
              label: "the previous working day",
            },
            {
              value: "the_same_day_next_week",
              label: "the same day next week",
            },
            {
              value: "the_same_day_next_month",
              label: "the same day next month",
            },
            {
              value: "the_same_day_next_year",
              label: "the same day next year",
            },
          ],
          value: null,
        },
        [EnumSelectionType.Action]: {
          options: [{ value: EnumActions.SetDateCustomField, label: "set" }],
          value: { value: EnumActions.SetDateCustomField, label: "set" },
        },
      },
      {
        type: ActionType.MoveDateCustomField,
        label: "move the date in custom field <fields> to <date_value>",
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
          fieldTypeFilter: "date",
        },
        [EnumInputType.DateValue]: {
          options: [
            { value: "same_day_next_week", label: "the same day next week" },
            { value: "plus_1_day", label: "by 1 day" },
            { value: "plus_2_days", label: "by 2 days" },
            { value: "next_monday", label: "the next monday" },
            { value: "first_day_month", label: "the 1st of the month" },
            {
              value: "first_monday_month",
              label: "the first monday of the month",
            },
            { value: "january_1st", label: "january 1st" },
          ],
          value: null,
        },
        [EnumSelectionType.Action]: {
          options: [{ value: "cardfields.date.move", label: "move" }],
          value: { value: "cardfields.date.move", label: "move" },
        },
      },
    ],
  },
  {
    type: "sort",
    label: "Sort",
    icon: <ArrowDownNarrowWide />,
  },
  {
    type: "cascade",
    label: "Cascade",
    icon: <ArrowDownNarrowWide />,
  },
  {
    type: "notify",
    label: "Notify",
    icon: <Bell />,
    items: [
      {
        type: ActionType.NotifyTheCard,
        label:
          "Send notification via <channel> to <user> with message <text_input>",
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.Notify,
              label: "Notify",
            },
          ],
          value: {
            value: EnumActions.Notify,
            label: "Notify",
          },
        },
        [EnumSelectionType.Channel]: {
          options: [
            {
              value: "whatsapp",
              label: "WhatsApp",
            },
            {
              value: "telegram",
              label: "Telegram",
            },
          ],
          value: {
            value: "whatsapp",
            label: "WhatsApp",
          },
        },
        [EnumSelectionType.User]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.TextInput]: {
          placeholder: "Enter your message here...",
          value: "",
        },
      },
      {
        type: ActionType.NotifySelectedUser,
        label:
          "Send notification via <channel> to <selected_user> with message <text_input> and custom fields <multi_fields>",
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.Notify,
              label: "Notify",
            },
          ],
          value: {
            value: EnumActions.Notify,
            label: "Notify",
          },
        },
        [EnumTextType.SelectedUser]: {},
        [EnumSelectionType.Channel]: {
          options: [
            {
              value: "whatsapp",
              label: "WhatsApp",
            },
            {
              value: "telegram",
              label: "Telegram",
            },
          ],
          value: {
            value: "whatsapp",
            label: "WhatsApp",
          },
        },
        [EnumSelectionType.TextInput]: {
          placeholder: "Enter your message here...",
          value: "",
        },
        [EnumSelectionType.MultiFields]: {
          options: [],
          value: null,
        },
      },
      {
        type: ActionType.NotifyUserFromCustomFields,
        label:
          "Send notification via <channel> to <selected_user> from custom fields <fields> with message <text_input> and custom fields <multi_fields>",
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.Notify,
              label: "Notify",
            },
          ],
          value: {
            value: EnumActions.Notify,
            label: "Notify",
          },
        },
        [EnumSelectionType.Channel]: {
          options: [
            {
              value: "whatsapp",
              label: "WhatsApp",
            },
            {
              value: "telegram",
              label: "Telegram",
            },
          ],
          value: {
            value: "whatsapp",
            label: "WhatsApp",
          },
        },
        [EnumTextType.SelectedUser]: {},
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.TextInput]: {
          placeholder: "Enter your message here...",
          value: "",
        },
        [EnumSelectionType.MultiFields]: {
          options: [],
          value: null,
        },
      },
    ],
  },
];

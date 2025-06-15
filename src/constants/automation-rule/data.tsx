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
  EnumTriggerCardFilter,
  TriggerType,
  ActionType,
  EnumTextType,
  EnumInputType,
} from "@myTypes/automation-rule";
import {
  EnumOptionPosition,
  EnumOptionsNumberComparisonOperators,
  EnumOptionsSet,
  EnumOptionsSubject,
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
              value: EnumOptionsSubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me",
          },
          data: []
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
              value: EnumOptionsSubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me",
          },
          data: []
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
              value: EnumOptionsSubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me",
          },
          data: []
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
              value: EnumOptionsSubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me",
          },
          data: []
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
        type: TriggerType.WhenCustomFieldsIsSetToFieldValue,
        label: TriggerType.WhenCustomFieldsIsSetToFieldValue.replaceAll(
          "-",
          " "
        ),
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
              value: EnumOptionsSubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me",
          },
          data: []
        },
      },
      {
        type: TriggerType.WhenCustomFieldsIsSet,
        label: TriggerType.WhenCustomFieldsIsSet.replaceAll("-", " "),
        [EnumSelectionType.Fields]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.Set]: {
          options: [
            {
              value: EnumOptionsSet.Set,
              label: "set",
            },
            {
              value: EnumOptionsSet.Cleared,
              label: "cleared",
            },
          ],
          value: {
            value: EnumOptionsSet.Set,
            label: "set",
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionsSubject.ByMe,
              label: "by me",
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone",
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me",
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user",
            },
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me",
          },
          data: []
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
  },
  {
    type: "fields",
    label: "Fields",
    icon: <AlignJustify />,
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
    ],
  },
];

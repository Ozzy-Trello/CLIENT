import { AlignJustify, ArrowDownNarrowWide, Check, Clock, MessageSquare, Minus, MoveRight, Plus, User } from "lucide-react";
import { AutomationRuleAction, AutomationRuleTrigger } from "@myTypes/type";
import { EnumActions, EnumUserActionEvent } from "@myTypes/event";
import { ActionGroupType, ActionType, EnumSelectionType, TriggerGroupType, TriggerType } from "@myTypes/automation-rule";
import { EnumOptionPosition, EnumOptionsNumberComparisonOperators, EnumOptionsSubject } from "@myTypes/options";

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
              label: "Added to"
            },
            {
              value: EnumUserActionEvent.CreatedIn,
              label: "Created in"
            },
            {
              value: EnumUserActionEvent.CardEmailedTo,
              label: "Emailed to"
            },
            {
              value: EnumUserActionEvent.CardMovedInto,
              label: "Moved into"
            },
            {
              value: EnumUserActionEvent.CardMovedOutOf,
              label: "Moved out of"
            }
          ],
          value: {
            value: EnumUserActionEvent.CardAddedTo,
            label: "Added to"
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionsSubject.ByMe,
              label: "by me"
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone"
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user"
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me"
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user"
            }
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me"
          }
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
              label: "Added to"
            },
            {
              value: EnumUserActionEvent.CreatedIn,
              label: "Created in"
            },
            {
              value: EnumUserActionEvent.CardEmailedTo,
              label: "Emailed to"
            },
            {
              value: EnumUserActionEvent.CardMovedInto,
              label: "Moved into"
            },
            {
              value: EnumUserActionEvent.CardMovedOutOf,
              label: "Moved out of"
            }
          ],
          value:  {
            value: EnumUserActionEvent.CardAddedTo,
            label: "Added to"
          },
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionsSubject.ByMe,
              label: "by me"
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone"
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user"
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me"
            },
             {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user"
            }
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me"
          }
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null
        }
      },
      {
        type: TriggerType.WhenACardHasArchivalAction,
        label: TriggerType.WhenACardHasArchivalAction.replaceAll("-", ""),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.CardArchived,
              label: "Archived"
            },
            {
              value: EnumUserActionEvent.CardUnarchived,
              label: "Unarchived"
            }
          ],
          value: {
            value: EnumUserActionEvent.CardArchived,
            label: "Archived"
          }
        },
        [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionsSubject.ByMe,
              label: "by me"
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone"
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user"
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me"
            },
             {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user"
            }
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me"
          }
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null,
        }
      },
      {
        type: TriggerType.WhenAListIsAction,
        label: TriggerType.WhenAListIsAction.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumUserActionEvent.ListCreated,
              label: "Created"
            },
            {
              value: EnumUserActionEvent.ListRenamed,
              label: "Renamed"
            },
            {
              value: EnumUserActionEvent.ListArchived,
              label: "Archived"
            },
            {
              value: EnumUserActionEvent.ListUnarchived,
              label: "Unarchived"
            }
          ],
          value: {
            value: EnumUserActionEvent.ListCreated,
            label: "Created"
          }
        },
       [EnumSelectionType.OptionalBySubject]: {
          options: [
            {
              value: EnumOptionsSubject.ByMe,
              label: "by me"
            },
            {
              value: EnumOptionsSubject.ByAnyone,
              label: "by anyone"
            },
            {
              value: EnumOptionsSubject.BySpecificUser,
              label: "by specific user"
            },
            {
              value: EnumOptionsSubject.ByAnyoneExceptMe,
              label: "by anyone except me"
            },
             {
              value: EnumOptionsSubject.ByAnyoneExceptSpecificUser,
              label: "by anyone except specific user"
            }
          ],
          value: {
            value: EnumOptionsSubject.ByMe,
            label: "by me"
          }
        },
      },
      {
        type: TriggerType.WhenListHasCards,
        label: TriggerType.WhenListHasCards.replaceAll("-", " "),
        [EnumSelectionType.NumberComparison]: {
          options: [
            {
              value: EnumOptionsNumberComparisonOperators.Exactly,
              label: "exactly"
            },
            {
              value: EnumOptionsNumberComparisonOperators.FewerThan,
              label: "fewer than"
            },
            {
              value: EnumOptionsNumberComparisonOperators.MoreThan,
              label: "more than"
            },
          ],
          value: {
            value: EnumOptionsNumberComparisonOperators.Exactly,
            label: "exactly"
          }
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null,
        }
      }
    ]
  },
  {
    type: TriggerGroupType.CardChanges,
    label: "Card Changes",
    icon: <div className="flex gap-1"> <Plus/> <Minus/> </div>
  },
  {
    type: TriggerGroupType.CardDates,
    label: "Dates",
    icon: <Clock />
  },
  {
    type: TriggerGroupType.CardChecklist,
    label: "Checklists",
    icon: <Check />
  },
  {
    type: TriggerGroupType.CardContent,
    label: "Card Content",
    icon: <MessageSquare />
  },
  {
    type: TriggerGroupType.CardFields,
    label: "Fields",
    icon: <AlignJustify />
  }
];

export const actions: AutomationRuleAction[] = [
  {
    type: ActionGroupType.CardMove,
    label: "Move",
    icon: <MoveRight />,
    items: [
      {
        type: ActionType.ActionTheCardToPositionInSpecificList,
        label: ActionType.ActionTheCardToPositionInSpecificList.replaceAll("-", " "),
        [EnumSelectionType.Position]: {
          options: [
            {
              value: EnumOptionPosition.TopOfList,
              label: "The top of the list"
            },
            {
              value: EnumOptionPosition.BottomOfList,
              label: "The bottom of the list"
            },
            {
              value: EnumOptionPosition.NextList,
              label: "next list on the board"
            },
            {
              value: EnumOptionPosition.PreviousList,
              label: "previous_list_on_the_board"
            }
          ],
          value: {
            value: EnumOptionPosition.TopOfList,
            label: "The top of the list"
          }
        },
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.Move,
              label: "Move",
            },
            {
              value: EnumActions.Copy,
              label: "Copy"
            }
          ],
          value: {
            value: EnumActions.Move,
            label: "Move",
          }
        }
      },
      {
        type: ActionType.ActionTheCardToPosition,
        label: ActionType.ActionTheCardToPosition.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.Move,
              label: "Move",
            },
          ],
          value: {
            value: EnumActions.Move,
            label: "Move",
          }
        },
        [EnumSelectionType.Position]: {
          options: [
            {
              value: EnumOptionPosition.TopOfList,
              label: "The top of the list"
            },
            {
              value: EnumOptionPosition.BottomOfList,
              label: "The bottom of the list"
            }
          ],
          value: {
            value: EnumOptionPosition.TopOfList,
            label: "The top of the list"
          }
        },
      },
      {
        type: ActionType.ArchivalActionTheCard,
        label: ActionType.ArchivalActionTheCard.replaceAll("-", " "),
        [EnumSelectionType.Action]: {
          options: [
            {
              value: EnumActions.Archive,
              label: "archived"
            },
            {
              value: EnumActions.Unarchive,
              label: "unarchived"
            }
          ],
          value: {
            value: EnumActions.Archive,
            label: "archived"
          }
        }
      }
    ]
  },
  {
    type: "card_add_remove",
    label: "Add/Remove",
    icon: <div className="flex gap-1"> <Plus/> <Minus/> </div>
  },
  {
    type: "card_dates",
    label: "Dates",
    icon: <Clock />
  },
  {
    type: "checklists",
    label: "Checklists",
    icon: <Check />
  },
  {
    type: "members",
    label: "Members",
    icon: <User />
  },
  {
    type: "card_content",
    label: "Card Content",
    icon: <MessageSquare />
  },
  {
    type: "fields",
    label: "Fields",
    icon: <AlignJustify />
  },
  {
    type: "sort",
    label: "Sort",
    icon: <ArrowDownNarrowWide />
  },
  {
    type: "cascade",
    label: "Cascade",
    icon: <ArrowDownNarrowWide />
  },
  
];
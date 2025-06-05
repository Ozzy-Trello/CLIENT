import { AlignJustify, ArrowDownNarrowWide, Check, Clock, MessageSquare, Minus, MoveRight, Plus, User } from "lucide-react";
import { CustomSelectionAction, CustomSelectionBoard, CustomSelectionBy, CustomSelectionList, CustomSelectionQtyCompOperator, CustomSelectionQtyCompOperatorOptions, TriggerTypeCardChanges, TriggerTypeCardContent, TriggerTypeCardMove, TriggerTypeChecklists, TriggerTypeDates, TriggerTypeFields } from "./automation-rule";
import { ActionType, TriggerType } from "@myTypes/type";

export const triggers: TriggerType[] = [
  {
    type: TriggerTypeCardMove,
    label: "Card Move",
    icon: <MoveRight />,
    items: [
      {
        type: "when_a_card_<filter>_is_<action>_to_the_<board>_by_<by>",
        label: "when a card <filter> is <action> to the board by <by>",
        [CustomSelectionAction]: {
          options: [
            {
              value: "added_to",
              label: "Added to"
            },
            {
              value: "created_in",
              label: "Created in"
            },
            {
              value: "emailed_to",
              label: "Emailed to"
            },
            {
              value: "moved_into",
              label: "Moved into"
            },
            {
              value: "moved_out_of",
              label: "Moved out of"
            }
          ],
          value: {
            value: "added_to",
            label: "Added to"
          },
        },
        [CustomSelectionBy]: {
          options: [
            {
              value: "me",
              label: "by me"
            },
            {
              value: "anyone",
              label: "by anyone"
            },
            {
              value: "anyone_except_me",
              label: "by anyone except me"
            }
          ],
          value: {
            value: "me",
            label: "by me"
          }
        },
        [CustomSelectionBoard]: {
          options: [],
          value: null,
        }
      },
      {
        type: "when_a_card_<filter>_is_<action>_list_<list>_<by>",
        label: "when a card <filter> is <action> list <list> <by>",
        [CustomSelectionAction]: {
          options: [
            {
              value: "added_to",
              label: "Added to"
            },
            {
              value: "created_in",
              label: "Created in"
            },
            {
              value: "emailed_to",
              label: "Emailed to"
            },
            {
              value: "moved_into",
              label: "Moved into"
            },
            {
              value: "moved_out_of",
              label: "Moved out of"
            }
          ],
          value: {
            value: "added_to",
            label: "Added to"
          }
        },
        [CustomSelectionBy]: {
          options: [
            {
              value: "me",
              label: "by me"
            },
            {
              value: "anyone",
              label: "by anyone"
            },
            {
              value: "anyone_except_me",
              label: "by anyone except me"
            }
          ],
          value: {
            value: "me",
            label: "by me"
          }
        },
        [CustomSelectionList]: {
          options: [],
          value: null
        }
      },
      {
        type: "when_a_card_<filter>_is_<action>_list_<list>_<by>",
        label: "when a card <filter> is <action> list <list> <by>",
        [CustomSelectionAction]: {
          options: [
            {
              value: "archived",
              label: "Archived"
            },
            {
              value: "unrachived",
              label: "Unarchived"
            }
          ],
          value: {
            value: "archived",
            label: "Archived"
          }
        },
        [CustomSelectionBy]: {
          options: [
            {
              value: "me",
              label: "by me"
            },
            {
              value: "anyone",
              label: "by anyone"
            },
            {
              value: "anyone_except_me",
              label: "by anyone except me"
            }
          ],
          value: {
            value: "me",
            label: "by me"
          }
        },
        [CustomSelectionList]: {
          options: [],
          value: null,
        }
      },
      {
        type: "when_a_list_is_<action>_<by>",
        label: "when a list is <action> <by>",
        [CustomSelectionAction]: {
          options: [
            {
              value: "created",
              label: "Created"
            },
            {
              value: "renamed",
              label: "Renamed"
            },
            {
              value: "archived",
              label: "Archived"
            },
            {
              value: "unarchived",
              label: "Unarchived"
            }
          ],
          value: {
            value: "created",
            label: "Created"
          }
        },
        [CustomSelectionBy]: {
          options: [
            {
              value: "me",
              label: "by me"
            },
            {
              value: "anyone",
              label: "by anyone"
            },
            {
              value: "anyone_except_me",
              label: "by anyone except me"
            }
          ],
          value: {
            value: "me",
            label: "by me"
          }
        }
      },
      {
        type: "when_list_<list>_has_<quantitative_comparison_operator>_[quantity]_(add)",
        label: "when list <list> has <quantitative_comparison_operator> [quantity] (add)",
        [CustomSelectionQtyCompOperator]: {
          options: CustomSelectionQtyCompOperatorOptions,
          value: CustomSelectionQtyCompOperatorOptions[0]
        },
        [CustomSelectionList]: {
          options: [],
          value: null
        }
      }
    ]
  },
  {
    type: TriggerTypeCardChanges,
    label: "Card Changes",
    icon: <div className="flex gap-1"> <Plus/> <Minus/> </div>
  },
  {
    type: TriggerTypeDates,
    label: "Dates",
    icon: <Clock />
  },
  {
    type: TriggerTypeChecklists,
    label: "Checklists",
    icon: <Check />
  },
  {
    type: TriggerTypeCardContent,
    label: "Card Content",
    icon: <MessageSquare />
  },
  {
    type: TriggerTypeFields,
    label: "Fields",
    icon: <AlignJustify />
  }
];

export const actions: ActionType[] = [
  {
    type: "card_move",
    label: "Move",
    icon: <MoveRight />,
    items: [
      {
        type: "<action>_the_card_to_<position>_<list>_<optional_board>",
        label: "<action> the card to <position> <list> <optional-board>",
        action: {
          options: [
            {
              value: "move",
              label: "Move"
            },
            {
              value: "copy",
              label: "Copy"
            }
          ],
          value: {
            value: "move",
            label: "Move"
          }
        },
        position: {
          options: [
            {
              value: "top_of_list",
              label: "The top of the list"
            },
            {
              value: "bottom_of_list",
              label: "The bottom of the list"
            }
          ],
          value: {
            value: "top_of_list",
            label: "The top of the list"
          }
        },
      },
      {
        type: "move_the_card_to_<position>",
        label: "move the card to the <position>",
        position: {
          options: [
            {
              value: "top_of_list",
              label: "top of the list"
            },
            {
              value: "bottom_of_list",
              label: "bottom of the list"
            },
            {
              value: "next_list_on_board",
              label: "next list on the board"
            },
            {
              value: "previous_list_on_board",
              label: "previous_list_on_the_board"
            }
          ],
          value: {
            value: "top_of_list",
            label: "top of the list"
          }
        }
      },
      {
        type: "<action>_the_card",
        label: "<action> the card",
        action: {
          options: [
            {
              value: "archived",
              label: "archived"
            },
            {
              value: "unarchived",
              label: "unarchived"
            }
          ],
          value: {
            value: "archived",
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
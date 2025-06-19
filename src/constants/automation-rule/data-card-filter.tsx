import { AlignJustify, Check, Clock, MessageSquare, SwatchBook } from "lucide-react";
// import { TriggerCardFilterTypeBasic, TriggerCardFilterTypeChecklists, TriggerCardFilterTypeContent, TriggerCardFilterTypeDates, TriggerCardFilterTypeFields } from "./automation-rule";
import { CardTriggerFilterType } from "@myTypes/type";
import { EnumSelectionType, EnumTiggerCarFilterType, EnumTriggerCardFilterGroupType } from "@myTypes/automation-rule";
import { EnumAssignmentOperator, EnumAssignmentSubjectOperator, EnumInclusionOperator } from "@myTypes/options";

export const cardFilters: CardTriggerFilterType[] = [
  {
    type: EnumTriggerCardFilterGroupType.Basic,
    label: "Basic",
    icon: <SwatchBook size={14} />,
    items: [
      {
        type: EnumTiggerCarFilterType.CardInclusionInList,
        label: EnumTiggerCarFilterType.CardInclusionInList.replaceAll("-", " "),
        [EnumSelectionType.Inclusion]: {
          options: [
            {
              value: EnumInclusionOperator.In,
              label: "in"
            },
            {
              value: EnumInclusionOperator.NotIn,
              label: "not in"
            },
          ],
          value: {
            value: EnumInclusionOperator.In,
            label: "in"
          }
        },
        [EnumSelectionType.List]: {
          options: [],
          value: null
        }
      },
      {
        type: EnumTiggerCarFilterType.LabelInclusionInCard,
        label: EnumTiggerCarFilterType.LabelInclusionInCard.replaceAll("-", ""),
        [EnumSelectionType.Inclusion]: {
          options: [
            {
              value: EnumInclusionOperator.With,
              label: "with"
            },
            {
              value: EnumInclusionOperator.Without,
              label: "without"
            },
          ],
          value: {
            value: EnumInclusionOperator.With,
            label: "with"
          }
        },
        [EnumSelectionType.CardLabel]: {
          options: [],
          value: null
        }
      },
      {
        type: EnumTiggerCarFilterType.CardAssignment,
        label: EnumTiggerCarFilterType.CardAssignment.replaceAll("-", " "),
        [EnumSelectionType.Assignment]: {
          options: [
            {
              value: EnumAssignmentOperator.AssignedTo,
              label: "assigned to"
            },
            {
              value: EnumAssignmentOperator.AssignedOnlyTo,
              label: "assigned only to"
            },
            {
              value: EnumAssignmentOperator.NotAssignedTo,
              label: "not assigned to"
            },
          ],
          value: {
            value: EnumAssignmentOperator.AssignedTo,
            label: "assigned to"
          }
        },
        [EnumSelectionType.AssignmentSubject]: {
          options: [
            {
              value: EnumAssignmentSubjectOperator.Me,
              label: "me"
            },
            {
              value: EnumAssignmentSubjectOperator.Anyone,
              label: "anyone"
            },
            {
              value: EnumAssignmentSubjectOperator.Member,
              label: "member"
            },
          ],
          value: {
            value: EnumAssignmentSubjectOperator.Me,
            label: "me"
          }
        }
      }
    ]
  },
  {
    type: EnumTriggerCardFilterGroupType.Dates,
    label: "Dates",
    icon: <Clock size={14} />,
    items: []
  },
  {
    type: EnumTriggerCardFilterGroupType.Checklists,
    label: "Checklists",
    icon: <Check size={14} />,
    items: []
  }, 
  {
    type: EnumTriggerCardFilterGroupType.Content,
    label: "content",
    icon: <MessageSquare size={14} />,
    items: []
  },
  {
    type: EnumTriggerCardFilterGroupType.Fields,
    label: "Fields",
    icon: <AlignJustify size={14} />,
    items: []
  }
];
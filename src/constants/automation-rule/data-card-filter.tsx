import { AlignJustify, Check, Clock, MessageSquare, SwatchBook } from "lucide-react";
// import { TriggerCardFilterTypeBasic, TriggerCardFilterTypeChecklists, TriggerCardFilterTypeContent, TriggerCardFilterTypeDates, TriggerCardFilterTypeFields } from "./automation-rule";
import { CardTriggerFilterType } from "@myTypes/type";
import { EnumInputType, EnumSelectionType, EnumTiggerCarFilterType, EnumTriggerCardFilterGroupType } from "@myTypes/automation-rule";
import { EnumAssignmentOperator, EnumAssignmentSubjectOperator, EnumCardContentType, EnumChecklistConditionOperator, EnumCustomFieldAction, EnumDateStatusOperator, EnumInclusionOperator, EnumOptionCheckboxState, EnumOptionCompletion, EnumOptionsNumberComparisonOperators, EnumOptionTextComparisonOperator, EnumTimeComparisonOperator, EnumTimeRangeOperator, EnumTimeRelativeReference, EnumTimeUnit } from "@myTypes/options";

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
        },
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
    items: [
      {
        type: EnumTiggerCarFilterType.CardDueDates,
        label: EnumTiggerCarFilterType.CardDueDates.replaceAll("-", " "),
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
      },
      {
        type: EnumTiggerCarFilterType.CardStartDate,
        label: EnumTiggerCarFilterType.CardStartDate.replaceAll("-", " "),
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
      },
      {
        type: EnumTiggerCarFilterType.CardDateStatus,
        label: EnumTiggerCarFilterType.CardDateStatus.replaceAll("-", " "),
        [EnumSelectionType.DateStatus]: {
          options: [
            {
              value: EnumDateStatusOperator.Due,
              label: "due"
            },
            {
              value: EnumDateStatusOperator.NotDue,
              label: "not due"
            },
            {
              value: EnumDateStatusOperator.Starting,
              label: "starting"
            },
            {
              value: EnumDateStatusOperator.NotStarting,
              label: "not starting"
            },
          ],
          value: {
            value: EnumDateStatusOperator.Due,
            label: "due"
          }
        },
        [EnumSelectionType.TimeRange]: {
          options: [
            {
              value: EnumTimeRangeOperator.Today,
              label: "today"
            },
            {
              value: EnumTimeRangeOperator.Tomorrow,
              label: "tomorrow"
            },
            {
              value: EnumTimeRangeOperator.ThisWeek,
              label: "this-week"
            },
            {
              value: EnumTimeRangeOperator.NextWeek,
              label: "next-week"
            },
            {
              value: EnumTimeRangeOperator.ThisMonth,
              label: "this-month"
            },
            {
              value: EnumTimeRangeOperator.NextMonth,
              label: "next-month"
            },
          ],
          value: {
            value: EnumTimeRangeOperator.Today,
            label: "today"
          }
        },
      },
      {
        type: EnumTiggerCarFilterType.CardDateStatusWithSpecificDays,
        label: EnumTiggerCarFilterType.CardDateStatusWithSpecificDays.replaceAll("-", " "),
        [EnumSelectionType.DateStatus]: {
          options: [
            {
              value: EnumDateStatusOperator.Due,
              label: "due"
            },
            {
              value: EnumDateStatusOperator.Starting,
              label: "starting"
            },
          ],
          value: {
            value: EnumDateStatusOperator.Due,
            label: "due"
          }
        },
        [EnumSelectionType.TimeComparison]: {
          options: [
            {
              value: EnumTimeComparisonOperator.InLessThan,
              label: "in less than"
            },
            {
              value: EnumTimeComparisonOperator.InMoreThan,
              label: "in more than"
            },
            {
              value: EnumTimeComparisonOperator.In,
              label: "in"
            },
            {
              value: EnumTimeComparisonOperator.InBeetween,
              label: "in between"
            },
          ],
          value: {
            value: EnumTimeComparisonOperator.InLessThan,
            label: "in less than"
          }
        },
        [EnumInputType.Number]: null,
        [EnumSelectionType.TimeUnit]: {
          options: [
            {
              value: EnumTimeUnit.Days,
              label: "days"
            },
            {
              value: EnumTimeUnit.WorkingDays,
              label: "working-days"
            },
          ],
          value: {
            value: EnumTimeUnit.Days,
            label: "days"
          }
        }
      }
    ]
  },
  {
    type: EnumTriggerCardFilterGroupType.Checklists,
    label: "Checklists",
    icon: <Check size={14} />,
    items: [
      {
        type: EnumTiggerCarFilterType.CardChecklist,
        label: EnumTiggerCarFilterType.CardChecklist.replaceAll("-", " "),
        [EnumSelectionType.ChecklistConditionOperator]: {
          options: [
            {
              value: EnumChecklistConditionOperator.WithAllComplete,
              label: "with all complete checklists"
            },
            {
              value: EnumChecklistConditionOperator.WithAnIncompleteChecklists,
              label: "with an incomplte checklist"
            },
            {
              value: EnumChecklistConditionOperator.WithCheckists,
              label: "with checklists"
            },
            {
              value: EnumChecklistConditionOperator.WithoutChecklists,
              label: "without checklists"
            },
            {
              value: EnumChecklistConditionOperator.WithoutChecklist,
              label: "without checklist"
            },
          ],
          value: {
            value: EnumChecklistConditionOperator.WithAllComplete,
            label: "with all complete checklists"
          }
        },
      },
    ]
  }, 
  {
    type: EnumTriggerCardFilterGroupType.Content,
    label: "content",
    icon: <MessageSquare size={14} />,
    items: [
      {
        type: EnumTiggerCarFilterType.CardContentTileDescription,
        label: EnumTiggerCarFilterType.CardContentTileDescription.replaceAll("-", " "),
        [EnumSelectionType.CardContentType]: {
          options: [
            {
              value: EnumCardContentType.AName,
              label: "a name"
            },
            {
              value: EnumCardContentType.ADescription,
              label: "a description"
            },
            {
              value: EnumCardContentType.ANameOrDescription,
              label: "a name or a description"
            },
          ],
          value:  {
            value: EnumCardContentType.AName,
            label: "a name"
          },
        },
        [EnumSelectionType.TextComparison]: {
          options: [
            {
              value: EnumOptionTextComparisonOperator.StartingWith,
              label: "starting with"
            },
            {
              value: EnumOptionTextComparisonOperator.EndingWith,
              label: "ending with"
            },
            {
              value: EnumOptionTextComparisonOperator.Containing,
              label: "containing"
            },
            {
              value: EnumOptionTextComparisonOperator.NotStartingWith,
              label: "not starting with"
            },
            {
              value: EnumOptionTextComparisonOperator.NotEndingWith,
              label: "not ending with"
            },
            {
              value: EnumOptionTextComparisonOperator.NotContaining,
              label: "not containing"
            },
          ],
          value:  {
            value: EnumOptionTextComparisonOperator.StartingWith,
            label: "starting with"
          },
        },
        [EnumInputType.Text]: null
      },
      {
        type: EnumTiggerCarFilterType.CardContentDescriptionInclusion,
        label: EnumTiggerCarFilterType.CardContentDescriptionInclusion.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
      },
    ]
  },
  {
    type: EnumTriggerCardFilterGroupType.Fields,
    label: "Fields",
    icon: <AlignJustify size={14} />,
    items: [
      {
        type: EnumTiggerCarFilterType.CardCustomField1,
        label: EnumTiggerCarFilterType.CardCustomField1.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.Completion]: {
          options: [
            {
              value: EnumOptionCompletion.Complete,
              label: "completed"
            }
          ],
          value: {
            value: EnumOptionCompletion.Complete,
            label: "completed"
          }
        }
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField2,
        label: EnumTiggerCarFilterType.CardCustomField2.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.Completion]: {
          options: [
            {
              value: EnumOptionCompletion.Complete,
              label: "completed"
            }
          ],
          value: {
            value: EnumOptionCompletion.Complete,
            label: "completed"
          }
        }
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField3,
        label: EnumTiggerCarFilterType.CardCustomField3.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.CustomFieldAction]: {
          options: [
            {
              value: EnumCustomFieldAction.Set,
              label: "set"
            },
            {
              value: EnumCustomFieldAction.Cleared,
              label: "cleared"
            }
          ],
          value: {
            value: EnumCustomFieldAction.Set,
            label: "set"
          },
        },
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField4,
        label: EnumTiggerCarFilterType.CardCustomField4.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumInputType.Text]: null
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField5,
        label: EnumTiggerCarFilterType.CardCustomField5.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.CheckboxState]: {
          options: [
            {
              value: EnumOptionCheckboxState.Checked,
              label: "checked"
            },
            {
              value: EnumOptionCheckboxState.Unchecked,
              label: "unchecked"
            },
          ],
          value: {
            value: EnumOptionCheckboxState.Checked,
            label: "checked"
          }
        }
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField6,
        label: EnumTiggerCarFilterType.CardCustomField6.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.NumberComparison]: {
          options: [
            {
              value: EnumOptionsNumberComparisonOperators.MoreThan,
              label: "more than"
            },
            {
              value: EnumOptionsNumberComparisonOperators.MoreOrEqual,
              label: "more or equal to"
            },
            {
              value: EnumOptionsNumberComparisonOperators.FewerThan,
              label: "fewer than"
            },
            {
              value: EnumOptionsNumberComparisonOperators.FewerOrEqual,
              label: "fewer or equal to"
            },
          ],
          value: {
            value: EnumOptionsNumberComparisonOperators.MoreThan,
            label: "more than"
          }
        },
        [EnumInputType.Number]: null
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField7,
        label: EnumTiggerCarFilterType.CardCustomField7.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.Inclusion+"_2"]: {
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
        [EnumSelectionType.TimeRange]: {
          options: [
            {
              value: EnumTimeRangeOperator.ThisWeek,
              label: "this week"
            },
            {
              value: EnumTimeRangeOperator.ThisMonth,
              label: "this month"
            },
          ],
          value: {
            value: EnumTimeRangeOperator.ThisWeek,
            label: "this week"
          }
        },
      },
      {
        type: EnumTiggerCarFilterType.CardCustomField8,
        label: EnumTiggerCarFilterType.CardCustomField8.replaceAll("-", " "),
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
          value:  {
            value: EnumInclusionOperator.With,
            label: "with"
          },
        },
        [EnumSelectionType.CustomField]: {
          options: [],
          value: null,
        },
        [EnumSelectionType.TimeComparison]: {
          options: [
            {
              value: EnumTimeComparisonOperator.LessThan,
              label: "less than"
            },
            {
              value: EnumTimeComparisonOperator.MoreThan,
              label: "more than"
            },
            {
              value: EnumTimeComparisonOperator.Between,
              label: "between"
            },
          ],
          value: {
            value: EnumTimeComparisonOperator.LessThan,
            label: "less than"
          }
        },
        [EnumInputType.Number]: null,
        [EnumSelectionType.TimeUnit]: {
          options: [
            {
              value: EnumTimeUnit.Days,
              label: "days"
            },
             {
              value: EnumTimeUnit.WorkingDays,
              label: "working days"
            }
          ],
          value: {
            value: EnumTimeUnit.Days,
            label: "days"
          }
        },
        [EnumSelectionType.TimeRelativeReference]: {
          options: [
            {
              value: EnumTimeRelativeReference.FromNow,
              label:"from now"
            },
            {
              value: EnumTimeRelativeReference.Ago,
              label:"ago"
            }
          ],
          value:{
            value: EnumTimeRelativeReference.FromNow,
            label:"from now"
          }
        }
      },
    ]
  }
];
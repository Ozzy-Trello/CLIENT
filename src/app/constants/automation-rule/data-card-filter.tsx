import { CardTriggerFilterType } from "@/app/dto/types";
import { AlignJustify, Check, Clock, MessageSquare, SwatchBook } from "lucide-react";
import { TriggerCardFilterTypeBasic, TriggerCardFilterTypeChecklists, TriggerCardFilterTypeContent, TriggerCardFilterTypeDates, TriggerCardFilterTypeFields } from "./automation-rule";

export const cardFilters: CardTriggerFilterType[] = [
  {
    type: TriggerCardFilterTypeBasic,
    label: "Basic",
    icon: <SwatchBook size={14} />,
    items: [
      {
        type: "<in_operator>_list_<list>",
        label: "<in_operator> list <list>",
        in_operator: {
          options: [
            {
              value: "in",
              label: "in"
            },
            {
              value: "not_in",
              label: "not in"
            },
          ],
          value: {
            value: "in",
            label: "in"
          }
        },
        list: {
          options: [],
          value: null
        }
      },
      {
        type: "<with_operator>_the_<label>_label",
        label: "<with_operator> the <label> label",
        with_operator: {
          options: [],
          value: null
        },
        card_label: {
          options: [],
          value: null
        }
      },
      {
        type: "<assignment_operator>_<assignment_target>",
        label: "<assignment_operator> <assignment_target>"
      }
    ]
  },
  {
    type: TriggerCardFilterTypeDates,
    label: "Dates",
    icon: <Clock size={14} />,
    items: []
  },
  {
    type: TriggerCardFilterTypeChecklists,
    label: "Checklists",
    icon: <Check size={14} />,
    items: []
  }, 
  {
    type: TriggerCardFilterTypeContent,
    label: "content",
    icon: <MessageSquare size={14} />,
    items: []
  },
  {
    type: TriggerCardFilterTypeFields,
    label: "Fields",
    icon: <AlignJustify size={14} />,
    items: []
  },
];
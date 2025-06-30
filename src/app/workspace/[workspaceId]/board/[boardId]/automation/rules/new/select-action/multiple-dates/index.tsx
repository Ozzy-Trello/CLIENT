import { Popover } from "antd";
import { Calendar, Trash2 } from "lucide-react";
import { Dispatch, FC, SetStateAction, useEffect } from "react";
import TypeDate from "./type-date";
import { useMultipleDatesContext } from "./context";
import { AutomationRule, AutomationRuleAction } from "@myTypes/type";

interface MultipleDatesProps {
  nextStep: () => void;
  prevStep: () => void;
  setSelectedRule: Dispatch<SetStateAction<AutomationRule>>;
  selectedRule: AutomationRule;
  actionsData: AutomationRuleAction[];
  setActionsData: Dispatch<SetStateAction<AutomationRuleAction[]>>;
  groupIndex: number;
  index: number;
  placeholder: string;
}

const MultipleDates: FC<MultipleDatesProps> = ({
  nextStep,
  prevStep,
  setSelectedRule,
  selectedRule,
  actionsData,
  setActionsData,
  groupIndex,
  index,
  placeholder,
}) => {
  const { open, setOpen, valueDates, removeValueDate } =
    useMultipleDatesContext();

  useEffect(() => {
    const handleChange = () => {
      const copy = [...actionsData];

      (copy[groupIndex]?.items?.[index][placeholder] as any).value = valueDates;
      setActionsData(copy);
    };

    handleChange();
  }, [valueDates]);

  return (
    <div className="flex items-center gap-2">
      {valueDates.map((item, index) => (
        <div
          key={index}
          className="px-3 py-1 bg-gray-50 rounded-lg flex justify-between items-center gap-4"
        >
          <div>{item.display}</div>
          <Trash2
            size={12}
            className="cursor-pointer"
            onClick={() => removeValueDate(index)}
          />
        </div>
      ))}

      <Popover
        content={<TypeDate />}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
      >
        <div className="w-6 h-6 border flex items-center justify-center border-gray-400 cursor-pointer hover:border-white duration-300">
          <Calendar size={12} />
        </div>
      </Popover>
    </div>
  );
};

export default MultipleDates;

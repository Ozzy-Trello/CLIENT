import { Form, Input } from "antd";
import { Check, X } from "lucide-react";
import { FC, Dispatch, SetStateAction } from "react";
import { AutomationRule, AutomationRuleAction } from "@myTypes/type";
import { useDebouncedCallback } from "@hooks/useDebouncedCallback";

interface MultipleChecklistProps {
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

const MultipleChecklist: FC<MultipleChecklistProps> = ({
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
  const onValuesChange = useDebouncedCallback((_, values: any) => {
    const copy = [...actionsData];

    (copy[groupIndex]?.items?.[index][placeholder] as any).value =
      values.checklist;
    setActionsData(copy);
  }, 500);

  return (
    <Form
      onValuesChange={onValuesChange}
      className="flex flex-col gap-2 items-center"
    >
      <Form.List name="checklist">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => {
              return (
                <div
                  key={key}
                  className="grid grid-cols-12 place-items-center gap-2 bg-gray-50 rounded-lg p-2 h-full"
                >
                  <div className="flex items-center gap-2 col-span-3">
                    <div className="whitespace-nowrap">and add the</div>
                    <Form.Item
                      {...restField}
                      name={[name, "name"]}
                      noStyle
                      className=""
                    >
                      <Input placeholder="Checklist name" />
                    </Form.Item>
                  </div>

                  <div className="flex items-center gap-2 col-span-3">
                    <div className="whitespace-nowrap">chekclist from card</div>
                    <Form.Item {...restField} name={[name, "cardName"]} noStyle>
                      <Input placeholder="Card link or name" />
                    </Form.Item>
                  </div>

                  <div className="flex items-center gap-2 col-span-4">
                    <div className="whitespace-nowrap">renamed to</div>
                    <Form.Item
                      noStyle
                      {...restField}
                      name={[name, "renamedTo"]}
                    >
                      <Input placeholder="New checklist name" />
                    </Form.Item>
                    <div className="whitespace-nowrap">to the card</div>
                  </div>
                  <div
                    onClick={() => remove(name)}
                    className="w-6 h-6 min-w-6 border flex items-center justify-center border-gray-400 cursor-pointer hover:border-gray-600 duration-300 col-span-2"
                  >
                    <X size={12} />
                  </div>
                </div>
              );
            })}

            <div
              onClick={() => add()}
              className="w-6 h-6 border flex items-center justify-center border-gray-400 cursor-pointer hover:border-white duration-300"
            >
              <Check size={12} />
            </div>
          </>
        )}
      </Form.List>
    </Form>
  );
};

export default MultipleChecklist;

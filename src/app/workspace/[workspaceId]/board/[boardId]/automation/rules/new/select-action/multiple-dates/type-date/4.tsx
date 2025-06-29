import { Button, Form } from "antd";
import { Plus } from "lucide-react";
import { FC } from "react";
import SelectSetDate from "../select/set-date";
import { EnumDay, EnumSetDate } from "@myTypes/options";
import SelectDay from "../select/day";
import { useMultipleDatesContext } from "../context";

const TypeDate4: FC = () => {
  const { setOpen, setValueDates } = useMultipleDatesContext();

  const onFinish = (values: any) => {
    setValueDates((prev) => {
      const label = `, and set ${values.setDate} the next week on ${values.day}`;

      return [...prev, { type: "4", display: label, ...values }];
    });
    setOpen(false);
  };

  return (
    <Form
      initialValues={{
        setDate: EnumSetDate.Due,
        day: EnumDay.Monday,
      }}
      className="flex items-center gap-2 justify-between"
      onFinish={onFinish}
    >
      <div className="flex items-center gap-2">
        <Form.Item name="setDate" noStyle>
          <SelectSetDate />
        </Form.Item>

        <div>the next week on</div>

        <Form.Item name="day" noStyle>
          <SelectDay filterOption={EnumDay.WorkingDay} />
        </Form.Item>
      </div>
      <Button type="text" htmlType="submit" className="w-max">
        <Plus className="cursor-pointer" />
      </Button>
    </Form>
  );
};

export default TypeDate4;

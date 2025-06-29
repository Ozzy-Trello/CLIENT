import { Button, Form, Input } from "antd";
import { Plus } from "lucide-react";
import { FC } from "react";
import SelectSetDate from "../select/set-date";
import DayType from "../select/day-type";
import { EnumDayType, EnumSetDate } from "@myTypes/options";
import { useMultipleDatesContext } from "../context";

const TypeDate1: FC = () => {
  const { setOpen, setValueDates } = useMultipleDatesContext();

  const onFinish = (values: any) => {
    setValueDates((prev) => {
      const label = `, and set ${values.setDate} ${values.dayType}`;

      return [...prev, { type: "1", display: label, ...values }];
    });
    setOpen(false);
  };

  return (
    <Form
      initialValues={{
        setDate: EnumSetDate.Due,
        dayType: EnumDayType.Now,
      }}
      className="flex items-center gap-2 justify-between"
      onFinish={onFinish}
    >
      <div className="flex items-center gap-2">
        <Form.Item name="setDate" noStyle>
          <SelectSetDate />
        </Form.Item>

        <Form.Item name="dayType" noStyle>
          <DayType />
        </Form.Item>
      </div>
      <Button type="text" htmlType="submit" className="w-max">
        <Plus className="cursor-pointer" />
      </Button>
    </Form>
  );
};

export default TypeDate1;

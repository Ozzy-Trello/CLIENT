import { Button, Form, Input } from "antd";
import { Plus } from "lucide-react";
import { FC } from "react";
import SelectSetDate from "../select/set-date";
import { EnumSetDate, EnumTimeType } from "@myTypes/options";
import SelectTimeType from "../select/time-type";
import { useMultipleDatesContext } from "../context";

const TypeDate2: FC = () => {
  const { setOpen, setValueDates } = useMultipleDatesContext();

  const onFinish = (values: any) => {
    setValueDates((prev) => {
      const label = `, and set ${values.setDate} in ${values.in} ${values.timeType}`;

      return [...prev, { type: "2", display: label, ...values }];
    });
    setOpen(false);
  };

  return (
    <Form
      initialValues={{
        setDate: EnumSetDate.Due,
        in: "1",
        timeType: EnumTimeType.Hours,
      }}
      className="flex items-center gap-2 justify-between"
      onFinish={onFinish}
    >
      <div className="flex items-center gap-2">
        <Form.Item name="setDate" noStyle>
          <SelectSetDate />
        </Form.Item>

        <div>in</div>

        <Form.Item name="in" noStyle>
          <Input className="w-16!" />
        </Form.Item>

        <Form.Item name="timeType" noStyle>
          <SelectTimeType />
        </Form.Item>
      </div>
      <Button type="text" htmlType="submit" className="w-max">
        <Plus className="cursor-pointer" />
      </Button>
    </Form>
  );
};

export default TypeDate2;

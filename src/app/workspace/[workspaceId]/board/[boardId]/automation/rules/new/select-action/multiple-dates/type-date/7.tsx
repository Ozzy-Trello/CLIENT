import { Button, Form, Input } from "antd";
import { Plus } from "lucide-react";
import { FC } from "react";
import SelectSetDate from "../select/set-date";
import { EnumMonth, EnumPlacement, EnumSetDate } from "@myTypes/options";
import SelectPlacement from "../select/placement";
import SelectMonth from "../select/month";
import { useMultipleDatesContext } from "../context";

const TypeDate7: FC = () => {
  const { setOpen, setValueDates } = useMultipleDatesContext();

  const onFinish = (values: any) => {
    setValueDates((prev) => {
      const label = `, and set ${values.setDate} on ${values.month} ${values.placement} ${values.year}`;

      return [...prev, { type: "7", display: label, ...values }];
    });
    setOpen(false);
  };

  return (
    <Form
      initialValues={{
        setDate: EnumSetDate.Due,
        placement: EnumPlacement["1st"],
        month: EnumMonth.January,
        year: new Date().getFullYear().toString(),
      }}
      className="flex items-center gap-2 justify-between"
      onFinish={onFinish}
    >
      <div className="flex items-center gap-2">
        <Form.Item name="setDate" noStyle>
          <SelectSetDate />
        </Form.Item>

        <div>on</div>
        <Form.Item name="month" noStyle>
          <SelectMonth />
        </Form.Item>
        <Form.Item name="placement" noStyle>
          <SelectPlacement
            filterOption={[EnumPlacement.LastDay, EnumPlacement.LastWorkingDay]}
          />
        </Form.Item>

        <Form.Item name="year" noStyle>
          <Input className="w-[100px]!" placeholder="Year (optional)" />
        </Form.Item>
      </div>
      <Button type="text" htmlType="submit" className="w-max">
        <Plus className="cursor-pointer" />
      </Button>
    </Form>
  );
};

export default TypeDate7;

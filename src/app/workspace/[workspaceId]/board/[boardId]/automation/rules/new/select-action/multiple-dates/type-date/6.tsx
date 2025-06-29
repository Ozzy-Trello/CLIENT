import { Button, Form } from "antd";
import { Plus } from "lucide-react";
import { FC } from "react";
import SelectSetDate from "../select/set-date";
import {
  EnumDay,
  EnumMonthPlacement,
  EnumPlacement2,
  EnumSetDate,
} from "@myTypes/options";
import SelectMonthPlacement from "../select/month-placement";
import SelectPlacement2 from "../select/placement2";
import SelectDay from "../select/day";
import { useMultipleDatesContext } from "../context";

const TypeDate6: FC = () => {
  const { setOpen, setValueDates } = useMultipleDatesContext();

  const onFinish = (values: any) => {
    setValueDates((prev) => {
      const label = `, and set ${values.setDate} on the ${values.placement} ${values.day} of ${values.of}`;

      return [...prev, { type: "6", display: label, ...values }];
    });
    setOpen(false);
  };

  return (
    <Form
      initialValues={{
        setDate: EnumSetDate.Due,
        placement: EnumPlacement2.First,
        of: EnumMonthPlacement.ThisMonth,
        day: EnumDay.Monday,
      }}
      className="flex items-center gap-2 justify-between"
      onFinish={onFinish}
    >
      <div className="flex items-center gap-2">
        <Form.Item name="setDate" noStyle>
          <SelectSetDate />
        </Form.Item>

        <div>on the</div>
        <Form.Item name="placement" noStyle>
          <SelectPlacement2 />
        </Form.Item>

        <Form.Item name="day" noStyle>
          <SelectDay filterOption={EnumDay.WorkingDay} />
        </Form.Item>

        <div>of</div>
        <Form.Item name="of" noStyle>
          <SelectMonthPlacement />
        </Form.Item>
      </div>
      <Button type="text" htmlType="submit" className="w-max">
        <Plus className="cursor-pointer" />
      </Button>
    </Form>
  );
};

export default TypeDate6;

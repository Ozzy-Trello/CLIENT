import { Button, Form } from "antd";
import { Plus } from "lucide-react";
import { FC } from "react";
import SelectSetDate from "../select/set-date";
import {
  EnumMonthPlacement,
  EnumPlacement,
  EnumSetDate,
} from "@myTypes/options";
import SelectPlacement from "../select/placement";
import SelectMonthPlacement from "../select/month-placement";
import { useMultipleDatesContext } from "../context";

const TypeDate5: FC = () => {
  const { setOpen, setValueDates } = useMultipleDatesContext();

  const onFinish = (values: any) => {
    setValueDates((prev) => {
      const label = `, and set ${values.setDate} ${values.placement} of ${values.of}`;

      return [...prev, { type: "5", display: label, ...values }];
    });
    setOpen(false);
  };

  return (
    <Form
      initialValues={{
        setDate: EnumSetDate.Due,
        placement: EnumPlacement["1st"],
        of: EnumMonthPlacement.ThisMonth,
      }}
      className="flex items-center gap-2 justify-between"
      onFinish={onFinish}
    >
      <div className="flex items-center gap-2">
        <Form.Item name="setDate" noStyle>
          <SelectSetDate />
        </Form.Item>

        <div>on</div>
        <Form.Item name="placement" noStyle>
          <SelectPlacement />
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

export default TypeDate5;

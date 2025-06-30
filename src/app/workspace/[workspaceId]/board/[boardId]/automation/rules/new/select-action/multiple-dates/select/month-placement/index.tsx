import { FC } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { MONTH_PLACEMENT } from "../../constant";

const SelectMonthPlacement: FC<TSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      className="min-w-[100px]"
      value={value}
      onChange={onChange}
      options={MONTH_PLACEMENT}
    />
  );
};

export default SelectMonthPlacement;

import { FC } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { MONTH } from "../../constant";

const SelectMonth: FC<TSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      className="min-w-[100px]"
      value={value}
      onChange={onChange}
      options={MONTH}
    />
  );
};

export default SelectMonth;

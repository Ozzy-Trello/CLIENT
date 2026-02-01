import { FC } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { TYPE_DAY } from "../../constant";

const SelectDayType: FC<TSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      className="min-w-[100px]"
      value={value}
      onChange={onChange}
      options={TYPE_DAY}
    />
  );
};

export default SelectDayType;

import { FC, useMemo } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { DAY } from "../../constant";
import { EnumDay } from "@myTypes/options";

interface ISelectDay extends TSelectProps {
  filterOption?: EnumDay;
}

const SelectDay: FC<ISelectDay> = ({ value, onChange, filterOption }) => {
  const options = useMemo(
    () => DAY.filter((option) => option.value !== filterOption),
    [filterOption]
  );

  return (
    <Select
      className="min-w-[100px]"
      value={value}
      onChange={onChange}
      options={options}
    />
  );
};

export default SelectDay;

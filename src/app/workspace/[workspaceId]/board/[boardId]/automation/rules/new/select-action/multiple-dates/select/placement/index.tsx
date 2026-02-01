import { FC, useMemo } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { PLACEMENT } from "../../constant";
import { EnumPlacement } from "@myTypes/options";

interface ISelectPlacement extends TSelectProps {
  filterOption?: EnumPlacement[];
}

const SelectPlacement: FC<ISelectPlacement> = ({
  value,
  onChange,
  filterOption,
}) => {
  const options = useMemo(
    () =>
      PLACEMENT.filter((option) => {
        if (!filterOption) return true;

        return !filterOption.includes(option.value);
      }),
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

export default SelectPlacement;

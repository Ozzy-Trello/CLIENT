import { FC } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { PLACEMENT } from "../../constant";
import SelectPlacement from "../placement";

const SelectPlacement2: FC<TSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      className="min-w-[100px]"
      value={value}
      onChange={onChange}
      options={PLACEMENT}
    />
  );
};

export default SelectPlacement2;

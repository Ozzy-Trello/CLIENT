import { FC } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { TYPE_TIME } from "../../constant";

const SelectTimeType: FC<TSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      className="min-w-[100px]"
      value={value}
      onChange={onChange}
      options={TYPE_TIME}
    />
  );
};

export default SelectTimeType;

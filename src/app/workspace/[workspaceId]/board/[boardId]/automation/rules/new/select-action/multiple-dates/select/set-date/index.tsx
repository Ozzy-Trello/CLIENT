import { FC } from "react";
import { TSelectProps } from "../../type";
import { Select } from "antd";
import { TYPE_SET_DATE } from "../../constant";

const SelectSetDate: FC<TSelectProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="whitespace-nowrap">and set</div>
      <Select
        className="min-w-[100px]"
        value={value}
        onChange={onChange}
        options={TYPE_SET_DATE}
      />
    </div>
  );
};

export default SelectSetDate;

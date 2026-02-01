import React from "react";
import { Button, Typography } from "antd";
import { List, X } from "lucide-react";
import { ListSelection } from "@components/selection";

interface CascadeOptionalListProps {
  groupIndex: number;
  index: number;
  placeholder: string;
  actionsData: any[];
  setActionsData: React.Dispatch<React.SetStateAction<any[]>>;
  value?: string;
  onChange?: (value: string, option: any) => void;
}

const CascadeOptionalList: React.FC<CascadeOptionalListProps> = ({
  groupIndex,
  index,
  placeholder,
  actionsData,
  setActionsData,
  value,
  onChange,
}) => {
  const actionItem = actionsData[groupIndex]?.items?.[index] as any;
  const hasOptionalList =
    actionItem && actionItem.optional_list_filter !== undefined;

  const handleToggleOptionalList = () => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item) {
      if (hasOptionalList) {
        delete item.optional_list_filter;
        // Also clear the actual selection value
        if (item[placeholder]) {
          item[placeholder].value = null;
        }
      } else {
        item.optional_list_filter = true;
      }
      setActionsData(copyArr);
    }
  };

  const handleListChange = (selectedValue: string, option: any) => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item && item[placeholder]) {
      item[placeholder].value = option;
      setActionsData(copyArr);
    }

    // Call the parent onChange if provided
    if (onChange) {
      onChange(selectedValue, option);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="text"
        size="small"
        className="mx-2"
        onClick={handleToggleOptionalList}
      >
        <List size={14} />
      </Button>
      {hasOptionalList && (
        <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
          <Typography.Text className="text-sm">in list</Typography.Text>
          <ListSelection
            width="fit-content"
            value={value || ""}
            onChange={handleListChange}
            className="mx-1"
            placeholder="Select list"
          />
          <Button type="text" size="small" onClick={handleToggleOptionalList}>
            <X size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CascadeOptionalList;

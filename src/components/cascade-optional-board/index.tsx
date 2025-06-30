import React from "react";
import { Button, Typography } from "antd";
import { Trello, X } from "lucide-react";
import { BoardSelection } from "@components/selection";

interface CascadeOptionalBoardProps {
  groupIndex: number;
  index: number;
  placeholder: string;
  actionsData: any[];
  setActionsData: React.Dispatch<React.SetStateAction<any[]>>;
  value?: string;
  onChange?: (value: string, option: any) => void;
}

const CascadeOptionalBoard: React.FC<CascadeOptionalBoardProps> = ({
  groupIndex,
  index,
  placeholder,
  actionsData,
  setActionsData,
  value,
  onChange,
}) => {
  const actionItem = actionsData[groupIndex]?.items?.[index] as any;
  const hasOptionalBoard =
    actionItem && actionItem.optional_board_filter !== undefined;

  const handleToggleOptionalBoard = () => {
    let copyArr = [...actionsData];
    const item = copyArr[groupIndex]?.items?.[index] as any;
    if (item) {
      if (hasOptionalBoard) {
        delete item.optional_board_filter;
        // Also clear the actual selection value
        if (item[placeholder]) {
          item[placeholder].value = null;
        }
      } else {
        item.optional_board_filter = true;
      }
      setActionsData(copyArr);
    }
  };

  const handleBoardChange = (selectedValue: string, option: any) => {
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
        onClick={handleToggleOptionalBoard}
      >
        <Trello size={14} />
      </Button>
      {hasOptionalBoard && (
        <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
          <Typography.Text className="text-sm">on board</Typography.Text>
          <BoardSelection
            width="fit-content"
            value={value || ""}
            onChange={handleBoardChange}
            className="mx-1"
            placeholder="Select board"
          />
          <Button type="text" size="small" onClick={handleToggleOptionalBoard}>
            <X size={12} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CascadeOptionalBoard;

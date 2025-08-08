import { AnyList } from "@myTypes/list";
import { UseMutateFunction } from "@tanstack/react-query";
import {
  Button,
  Input,
  Popover,
  Tooltip,
  Typography,
  InputNumber,
  message,
} from "antd";
import { Ellipsis } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ListNameProps {
  list: AnyList;
  boardId: string;
  updateList: UseMutateFunction<
    any,
    Error,
    { listId: string; updates: Partial<AnyList> },
    unknown
  >;
  cardsCount: number;
}

const colorOptions = [
  "#2e7d32", // green
  "#b8860b", // dark golden
  "#d2691e", // chocolate
  "#b71c1c", // dark red
  "#6a1b9a", // purple
  "#1565c0", // blue
  "#00695c", // teal
  "#558b2f", // light green
  "#ad1457", // pink
  "#616161", // gray
];

const ListName: React.FC<ListNameProps> = ({
  list,
  boardId,
  updateList,
  cardsCount,
}) => {
  const [isEditListName, setIsEditListName] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const inputRef = useRef<HTMLDivElement | null>(null);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [limitPopoverOpen, setLimitPopoverOpen] = useState(false);
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const [tempLimit, setTempLimit] = useState<number | null>(
    list.cardLimit || 10
  );

  const handleListNameClick = (): void => {
    setIsEditListName(true);
    setNewListName(list.name || "");
  };

  const cancelEditName = (): void => {
    setIsEditListName(false);
    setNewListName("");
  };

  const handleListNameOnChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setNewListName(e.target.value);
  };

  const handleUpdateListName = (): void => {
    if (newListName?.trim() && newListName !== list?.name && list.id) {
      let newList: AnyList = { ...list };
      newList.name = newListName;
      updateList({ listId: list.id, updates: newList });
      setIsEditListName(false);
      setNewListName("");
    }
  };

  const handlListNameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (e.key === "Enter") {
      handleUpdateListName();
      return;
    }

    if (e.key === "Escape") {
      cancelEditName();
      return;
    }
  };

  const handleClickOutside = (e: MouseEvent): void => {
    if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
      if (isEditListName) {
        cancelEditName();
      }
    }
  };

  const handleColorChange = (color: string) => {
    if (list.id) {
      updateList({
        listId: list.id,
        updates: { ...list, background: color },
      });
      message.success("List color updated");
    }
    setColorPopoverOpen(false);
    setActionsPopoverOpen(false);
  };

  const handleRemoveColor = () => {
    if (list.id) {
      updateList({
        listId: list.id,
        updates: { ...list, background: "#ffffff" },
      });
      message.success("List color removed");
    }
    setColorPopoverOpen(false);
    setActionsPopoverOpen(false);
  };

  const handleSetLimit = () => {
    if (!list.id) return;
    if (tempLimit && tempLimit > 0 && tempLimit !== list.cardLimit) {
      updateList({
        listId: list.id,
        updates: {
          ...list,
          cardLimit: tempLimit,
        },
      });
      message.success(`List limit set to ${tempLimit}`);
    } else if (tempLimit === list.cardLimit) {
      message.info("List limit is already set to that value");
    } else {
      message.warning("Please enter a value greater than 0");
    }
    setLimitPopoverOpen(false);
    setActionsPopoverOpen(false);
  };

  const getContrastColor = (hexcolor?: string) => {
    if (!hexcolor) return "#000000";

    // Convert hex to RGB
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  // Get appropriate text color for current background
  const getTextColor = () => {
    if (isLimitExceeded) return "#000000"; // Black text on yellow background
    if (headerColor) {
      // For custom colors, ensure strong contrast
      const contrast = getContrastColor(headerColor);
      return contrast === "#ffffff" ? "#ffffff" : "#000000";
    }
    return "black"; // Dark gray for default background
  };

  // Check if card limit is exceeded for yellow color
  const isLimitExceeded = list.cardLimit && cardsCount > list.cardLimit;
  const headerColor = list.background;

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditListName]);

  const colorPickerContent = (
    <div className="w-72">
      <div className="mb-3">
        <h4 className="text-sm font-medium mb-3">Change list color</h4>
        <div className="grid grid-cols-5 gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-12 h-12 rounded-md border-2 hover:scale-110 transition-transform ${
                list.background === color
                  ? "border-blue-500"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <button
        onClick={handleRemoveColor}
        className="w-full mt-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center justify-center gap-2"
      >
        <span>✕</span> Remove color
      </button>
    </div>
  );

  const limitSetterContent = (
    <div className="w-64 p-2">
      <h4 className="text-sm font-medium mb-3">Set list limit</h4>
      <div className="flex gap-2">
        <InputNumber
          min={1}
          max={999}
          value={tempLimit}
          onChange={(value) => setTempLimit(value)}
          className="flex-1"
          placeholder="Enter limit"
        />
        <Button type="primary" size="small" onClick={handleSetLimit}>
          Set
        </Button>
      </div>
    </div>
  );

  const actionsContent = (
    <div className="w-48">
      <Popover
        content={colorPickerContent}
        trigger="click"
        placement="right"
        open={colorPopoverOpen}
        onOpenChange={setColorPopoverOpen}
      >
        <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
          Change list color
        </button>
      </Popover>
      <Popover
        content={limitSetterContent}
        trigger="click"
        placement="right"
        open={limitPopoverOpen}
        onOpenChange={setLimitPopoverOpen}
      >
        <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
          Set list limit
        </button>
      </Popover>
    </div>
  );

  return (
    <div
      className={`px-4 py-3 border-b flex items-center justify-between ${
        isLimitExceeded ? "rounded-t-xl border-2" : ""
      }`}
      style={{
        // backgroundColor: isLimitExceeded
        //   ? "#fef3c7"
        //   : headerColor
        //   ? `${headerColor}20`
        //   : undefined,
        borderColor: isLimitExceeded
          ? "#f59e0b"
          : headerColor
          ? `${headerColor}30`
          : undefined,
      }}
    >
      {isEditListName ? (
        <div ref={inputRef}>
          <Input
            type="text"
            value={newListName}
            onChange={handleListNameOnChange}
            onKeyDown={handlListNameKeyDown}
            autoFocus
            className="text-sm border-none p-2 w-full"
            style={{
              backgroundColor: "transparent",
              color: getTextColor(),
            }}
          />
        </div>
      ) : (
        <Typography.Text
          onClick={handleListNameClick}
          className="text-sm font-semibold cursor-pointer mt-0 mb-0"
          style={{
            color: "black",
          }}
        >
          {list.name}
        </Typography.Text>
      )}

      <div className="flex items-center justify-end gap-1">
        <div
          className="rounded-full px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: isLimitExceeded
              ? "#f59e0b"
              : headerColor
              ? `${headerColor}40`
              : "#e5e7eb",
            color: isLimitExceeded ? "#ffffff" : "black",
          }}
        >
          {cardsCount}/{list.cardLimit || 0}
        </div>
        {/* Collapse list button */}
        {/* <Tooltip title={"collapse list"}>
          <Button
            type="text"
            size="small"
            className="flex items-center justify-center"
            style={{
              color: getTextColor(),
            }}
          >
            <span className="flex">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 3L2 8L7 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 3L22 8L17 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Button>
        </Tooltip> */}

        <Popover
          content={actionsContent}
          trigger="click"
          placement="bottomRight"
          open={actionsPopoverOpen}
          onOpenChange={setActionsPopoverOpen}
        >
          <Tooltip title={"List actions"}>
            <Button
              type="text"
              size="small"
              style={{
                color: getTextColor(),
              }}
            >
              <Ellipsis size={16} />
            </Button>
          </Tooltip>
        </Popover>
      </div>
    </div>
  );
};

export default ListName;

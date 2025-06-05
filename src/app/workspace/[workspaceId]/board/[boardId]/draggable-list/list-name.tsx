import { AnyList } from "@myTypes/list";
import { UseMutateFunction } from "@tanstack/react-query";
import { Button, Input, Tooltip, Typography } from "antd";
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
}

const ListName: React.FC<ListNameProps> = ({ list, boardId, updateList }) => {
  const [isEditListName, setIsEditListName] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const inputRef = useRef<HTMLDivElement | null>(null);

  console.log(list, "ini list");

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

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditListName]);

  return (
    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      {isEditListName ? (
        <div ref={inputRef}>
          <Input
            type="text"
            value={newListName}
            onChange={handleListNameOnChange}
            onKeyDown={handlListNameKeyDown}
            autoFocus
            className="text-sm border-none bg-gray-50 p-2 w-full"
          />
        </div>
      ) : (
        <Typography.Text
          onClick={handleListNameClick}
          className="text-sm font-semibold cursor-pointer mt-0 mb-0 text-gray-800"
        >
          {list.name}
        </Typography.Text>
      )}

      <div className="flex items-center justify-end gap-1">
        {list.name?.toLocaleLowerCase().includes("filter") ? null : (
          <div className="bg-gray-200 text-gray-600 rounded-full px-2 py-1 text-xs">
            {list.cards?.length}/{list.cardLimit}
          </div>
        )}
        {/* Collapse list button */}
        <Tooltip title={"collapse list"}>
          <Button
            type="text"
            size="small"
            className="flex items-center justify-center"
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
        </Tooltip>

        <Tooltip title={"List actions"}>
          <Button type="text" size="small">
            <Ellipsis size={16} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export default ListName;

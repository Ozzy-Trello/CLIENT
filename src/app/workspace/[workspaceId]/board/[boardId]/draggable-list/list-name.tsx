import { AnyList } from "@myTypes/list";
import { UseMutateFunction } from "@tanstack/react-query";
import { useDeleteAllCardsInList } from "@hooks/list";
import {
  Button,
  Input,
  Popover,
  Tooltip,
  Typography,
  InputNumber,
  message,
  Modal,
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
  deleteList: UseMutateFunction<any, Error, { listId: string }, unknown>;
  cardsCount: number;
  totalCards: number;
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
  deleteList,
  cardsCount,
  totalCards,
}) => {
  const [isEditListName, setIsEditListName] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const inputRef = useRef<HTMLDivElement | null>(null);
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);

  // Hook for deleting all cards in the list
  const { deleteAllCards, isDeletingAllCards } = useDeleteAllCardsInList();

  const [tempLimit, setTempLimit] = useState<number | null>(
    list.cardLimit || 0
  );

  const handleListNameClick = (): void => {
    setIsEditListName(true);
    setNewListName(list.name || "");
  };

  const handleListNameOnChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setNewListName(e.target.value);
  };

  const handlListNameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      handleListNameSubmit();
    } else if (e.key === "Escape") {
      setIsEditListName(false);
      setNewListName("");
    }
  };

  const handleListNameSubmit = (): void => {
    if (!list.id) return;
    if (newListName.trim() && newListName.trim() !== list.name) {
      updateList({
        listId: list.id,
        updates: {
          ...list,
          name: newListName.trim(),
        },
      });
      message.success("List name updated successfully!");
    } else if (newListName.trim() === list.name) {
      message.info("List name is already set to that value");
    } else {
      message.warning("Please enter a valid list name");
    }
    setIsEditListName(false);
    setNewListName("");
  };

  const handleDeleteList = () => {
    Modal.confirm({
      title: "Delete List",
      content: (
        <div className="py-4">
          <p className="mb-0">
            Are you sure you want to delete <strong>"{list.name}"</strong>?
          </p>
          <p className="mb-0 text-gray-600 mt-2">
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      styles: {
        body: {
          padding: "1rem",
        },
      },
      width: 450,
      centered: true,
      onOk: () => {
        deleteList({ listId: list.id });
        message.success("List deleted successfully!");
      },
    });
  };

  const handleDeleteAllCards = () => {
    Modal.confirm({
      title: "Delete All Cards",
      content: (
        <div className="py-4">
          <p className="mb-0">
            Are you sure you want to delete all cards in{" "}
            <strong>"{list.name}"</strong>?
          </p>
          <p className="mb-0 text-gray-600 mt-2">
            This will permanently delete {cardsCount} card
            {cardsCount !== 1 ? "s" : ""} and cannot be undone.
          </p>
        </div>
      ),
      okText: "Delete All Cards",
      okType: "danger",
      cancelText: "Cancel",
      styles: {
        body: {
          padding: "1rem",
        },
      },
      width: 450,
      centered: true,
      onOk: () => {
        deleteAllCards(
          { listId: list.id },
          {
            onSuccess: (response) => {
              const deletedCount = response?.data?.deleted_count || 0;
              message.success(
                `Successfully deleted all card${deletedCount !== 1 ? "s" : ""}!`
              );
              setActionsPopoverOpen(false);
            },
            onError: (error) => {
              message.error("Failed to delete cards. Please try again.");
              console.error("Delete all cards error:", error);
            },
          }
        );
      },
    });
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
    return getContrastColor(list.background || undefined);
  };

  const headerColor = list.background;
  const isLimitExceeded =
    list.cardLimit != null && list.cardLimit > 0 && cardsCount > list.cardLimit;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        if (isEditListName) {
          handleListNameSubmit();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditListName, newListName]);

  const actionsContent = (
    <div className="w-64 p-2">
      {/* Color Selection */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">List Color</div>
        <div className="grid grid-cols-5 gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded border-2 ${
                list.background === color
                  ? "border-gray-800"
                  : "border-gray-300"
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                updateList({
                  listId: list.id,
                  updates: { background: color },
                });
                setActionsPopoverOpen(false);
              }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            updateList({
              listId: list.id,
              updates: { background: "#ffffff" },
            });
            message.success("List color removed!");
            setActionsPopoverOpen(false);
          }}
          className="w-full mt-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center justify-center gap-2"
        >
          <span>✕</span> Remove color
        </button>
      </div>

      {/* Limit Setting */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Card Limit</div>
        <div className="flex items-center gap-2">
          <InputNumber
            size="small"
            min={1}
            max={100}
            value={tempLimit}
            onChange={(value) => setTempLimit(value || 1)}
            className="flex-1"
          />
          <Button
            size="small"
            type="primary"
            onClick={() => {
              if (tempLimit !== null) {
                updateList({
                  listId: list.id,
                  updates: { cardLimit: tempLimit },
                });
                message.success(`List limit set to ${tempLimit}`);
                setActionsPopoverOpen(false);
              }
            }}
          >
            Set
          </Button>
        </div>
      </div>

      <div className="border-t pt-2">
        <Button
          type="text"
          danger
          block
          onClick={() => {
            handleDeleteAllCards();
          }}
          className="text-left justify-start mb-2"
          disabled={cardsCount === 0 || isDeletingAllCards}
          loading={isDeletingAllCards}
        >
          Delete all cards in this list
        </Button>
        <Button
          type="text"
          danger
          block
          onClick={() => {
            handleDeleteList();
            setActionsPopoverOpen(false);
          }}
          className="text-left justify-start"
        >
          Delete List
        </Button>
      </div>
    </div>
  );

  return (
    <>
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
            {list.cardLimit != null && list.cardLimit > 0
              ? `${cardsCount} of ${totalCards} | limit ${list.cardLimit}`
              : `${cardsCount} of ${totalCards}`}
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
    </>
  );
};

export default ListName;

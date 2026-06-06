import { AnyList } from "@myTypes/list";
import { UseMutateFunction } from "@tanstack/react-query";
import {
  useDeleteAllCardsInList,
  useArchiveList,
  useMoveAllCardsInList,
  useArchiveAllCardsInList,
  useLists,
} from "@hooks/list";
import { useBoards } from "@hooks/board";
import {
  Button,
  Input,
  Popover,
  Tooltip,
  InputNumber,
  message,
  Modal,
  Select,
} from "antd";
import { Ellipsis, ChevronsLeft, Filter } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import { useCurrentAccount } from "@hooks/account";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";
import { LIST_SORT_OPTIONS, ListSortKey, ListSortOption } from "./sort-options";

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
  currentSortKey: ListSortKey;
  onSortChange: (key: ListSortKey) => void;
  onToggleCollapse?: (listId: string) => void;
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
  currentSortKey,
  onSortChange,
  onToggleCollapse,
}) => {
  const queryClient = useQueryClient();
  const [isEditListName, setIsEditListName] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>("");
  const inputRef = useRef<HTMLDivElement | null>(null);
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const params = useParams();
  const workspaceIdParam = (params?.workspaceId ?? "") as string | string[];
  const workspaceId = Array.isArray(workspaceIdParam)
    ? workspaceIdParam[0]
    : workspaceIdParam;
  const activeSortOption =
    LIST_SORT_OPTIONS.find((option) => option.key === currentSortKey) ??
    LIST_SORT_OPTIONS[0];


  const [menuView, setMenuView] = useState<
    "main" | "sort" | "color" | "move" | "limit" | "actions"
  >("main");
  
  const handlePopoverOpenChange = (open: boolean) => {
    setActionsPopoverOpen(open);
    if (!open) {
      setTimeout(() => setMenuView("main"), 300);
    }
  };


  // Get current user for super admin check
  const currentUser = useSelector(selectUser);
  const SUPER_ADMIN_ROLE_ID = "f97c942c-5d0c-49c3-b74d-5b149c08634f";
  const userRole = (currentUser?.role?.name || "").trim().toLowerCase();
  const isSuperAdmin =
    currentUser?.role?.id === SUPER_ADMIN_ROLE_ID ||
    userRole === "super admin" ||
    userRole === "super_admin" ||
    userRole === "superadmin";

  // Hook for deleting all cards in the list
  const { deleteAllCards, isDeletingAllCards } = useDeleteAllCardsInList();
  const { archiveList: archiveListMutate, isArchivingList } =
    useArchiveList(boardId);
  const { moveAllCards, isMovingAllCards } = useMoveAllCardsInList();
  const { archiveAllCards, isArchivingAllCards } = useArchiveAllCardsInList();
  const [targetBoardId, setTargetBoardId] = useState<string>(boardId);
  const shouldLoadMoveData = actionsPopoverOpen && menuView === "move";
  const { lists: moveLists, isLoading: isLoadingMoveLists } = useLists(
    shouldLoadMoveData ? targetBoardId || boardId : "",
  );
  const { boards: availableBoards, isLoading: isLoadingBoards } = useBoards(
    shouldLoadMoveData ? workspaceId || "" : "",
  );
  const { canArchiveList, canMoveCard, canUpdateCard } =
    useBoardPermissionsContext();

  const [targetListId, setTargetListId] = useState<string | undefined>(
    undefined,
  );

  const [tempLimit, setTempLimit] = useState<number | null>(
    list.cardLimit || 0,
  );

  const handleListNameClick = (): void => {
    setIsEditListName(true);
    setNewListName(list.name || "");
  };

  const handleListNameOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
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

  const applySort = (key: ListSortKey) => {
    onSortChange(key);
    const label = LIST_SORT_OPTIONS.find((opt) => opt.key === key)?.label;
    message.success(`Sorted by ${label || "selected"}`);
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
                `Successfully deleted all card${deletedCount !== 1 ? "s" : ""}!`,
              );
            },
            onError: (error) => {
              message.error("Failed to delete cards. Please try again.");
              console.error("Delete all cards error:", error);
            },
          },
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
  const safeTotalCards = Math.max(totalCards || 0, cardsCount || 0);
  const safeLoadedCards = Math.min(cardsCount || 0, safeTotalCards);

  useEffect(() => {
    setTargetBoardId(boardId);
    setTargetListId(undefined);
  }, [boardId]);

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

  const sortActionsContent = (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <Button
          size="small"
          type="text"
          icon={<ChevronsLeft size={16} />}
          onClick={() => setMenuView("main")}
        />
        <span className="text-sm font-medium">Sort List</span>
      </div>
      {LIST_SORT_OPTIONS.map((option) => (
        <Button
          key={option.key}
          size="small"
          type={currentSortKey === option.key ? "primary" : "text"}
          block
          onClick={() => applySort(option.key)}
          className="text-left justify-start"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );

  const colorActionsContent = (
    <div className="w-64 p-2">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <Button
          size="small"
          type="text"
          icon={<ChevronsLeft size={16} />}
          onClick={() => setMenuView("main")}
        />
        <span className="text-sm font-medium">List Color</span>
      </div>
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
        }}
        className="w-full mt-3 py-2 px-3 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center justify-start gap-2"
      >
        <span>✕</span> Remove color
      </button>
    </div>
  );

  const moveActionsContent = (
    <div className="w-64 p-2">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <Button
          size="small"
          type="text"
          icon={<ChevronsLeft size={16} />}
          onClick={() => setMenuView("main")}
        />
        <span className="text-sm font-medium">Move all cards</span>
      </div>
      <Select
        size="small"
        placeholder="Select target board"
        className="w-full mb-2"
        value={targetBoardId}
        onChange={(val) => {
          setTargetBoardId(val);
          setTargetListId(undefined);
        }}
        loading={isLoadingBoards}
        options={(availableBoards || []).map((b) => ({
          label: b.name,
          value: b.id,
        }))}
      />
      <Select
        size="small"
        placeholder="Select target list"
        className="w-full mb-2"
        value={targetListId}
        onChange={(val) => setTargetListId(val)}
        loading={isLoadingMoveLists}
        disabled={!targetBoardId}
        options={(moveLists || [])
          .filter((l) => !(targetBoardId === boardId && l.id === list.id))
          .map((l) => ({ label: l.name, value: l.id }))}
      />
      <Button
        size="small"
        type="primary"
        block
        disabled={!targetBoardId || !targetListId || isMovingAllCards}
        loading={isMovingAllCards}
        onClick={() => {
          if (!targetListId) return;
          Modal.confirm({
            title: "Move all cards",
            content: (
              <div className="py-4">
                <p className="mb-0">
                  Move all cards from <strong>"{list.name}"</strong> to the
                  selected list?
                </p>
                <p className="mb-0 text-gray-600 mt-2">
                  This will move all cards
                </p>
              </div>
            ),
            okText: "Move",
            cancelText: "Cancel",
            centered: true,
            onOk: () => {
              moveAllCards(
                { sourceListId: list.id, targetListId },
                {
                  onSuccess: (res) => {
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.cards.list(list.id),
                      refetchType: "active",
                    });
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.cards.list(targetListId),
                      refetchType: "active",
                    });
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.lists.all,
                      refetchType: "active",
                    });
                    const moved = res?.data?.moved_count ?? undefined;
                    message.success(
                      moved != null
                        ? `Moved ${moved} card${moved === 1 ? "" : "s"}`
                        : "All cards moved",
                    );
                    setTargetListId(undefined);
                  },
                  onError: () => {
                    message.error("Failed to move cards. Please try again.");
                  },
                },
              );
            },
          });
        }}
      >
        Move
      </Button>
    </div>
  );

  const limitActionsContent = (
    <div className="w-64 p-2">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <Button
          size="small"
          type="text"
          icon={<ChevronsLeft size={16} />}
          onClick={() => setMenuView("main")}
        />
        <span className="text-sm font-medium">Card Limit</span>
      </div>
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-1">Max cards in this list</div>
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
              }
            }}
          >
            Set
          </Button>
        </div>
      </div>
    </div>
  );

  const otherActionsContent = (
    <div className="w-64 p-2">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
        <Button
          size="small"
          type="text"
          icon={<ChevronsLeft size={16} />}
          onClick={() => setMenuView("main")}
        />
        <span className="text-sm font-medium">Actions</span>
      </div>
      {/* Super Admin Only Section */}
      {isSuperAdmin && (
        <>
          {canArchiveList() && (
            <>
              <Button
                type="text"
                block
                onClick={() => {
                  Modal.confirm({
                    title: "Archive all cards",
                    content: (
                      <div className="py-4">
                        <p className="mb-0">
                          Archive all cards in <strong>"{list.name}"</strong>?
                        </p>
                        <p className="mb-0 text-gray-600 mt-2">
                          This will move all cards
                        </p>
                      </div>
                    ),
                    okText: "Archive",
                    cancelText: "Cancel",
                    centered: true,
                    onOk: () => {
                      archiveAllCards(
                        { listId: list.id },
                        {
                          onSuccess: (res) => {
                            const archivedCount =
                              res?.data?.archived_count || cardsCount;
                            message.success(
                              `Archived ${archivedCount} card${
                                archivedCount === 1 ? "" : "s"
                              }`,
                            );
                          },
                          onError: () => {
                            message.error("Failed to archive cards.");
                          },
                        },
                      );
                    },
                  });
                }}
                className="text-left justify-start mb-2"
                disabled={cardsCount === 0 || isArchivingAllCards}
                loading={isArchivingAllCards}
              >
                Archive all cards in this list
              </Button>

              <Button
                type="text"
                block
                onClick={() => {
                  Modal.confirm({
                    title: "Archive List",
                    content: (
                      <div className="py-4">
                        <p className="mb-0">
                          Are you sure you want to archive{" "}
                          <strong>"{list.name}"</strong>?
                        </p>
                        <p className="mb-0 text-gray-600 mt-2">
                          The list will be hidden from the board but can be
                          restored later.
                        </p>
                      </div>
                    ),
                    okText: "Archive",
                    cancelText: "Cancel",
                    centered: true,
                    onOk: () => {
                      archiveListMutate(
                        { listId: list.id },
                        {
                          onSuccess: () => {
                            message.success("List archived successfully!");
                          },
                          onError: () => {
                            message.error("Failed to archive list.");
                          },
                        },
                      );
                    },
                  });
                }}
                className="text-left justify-start mb-2"
                disabled={isArchivingList}
                loading={isArchivingList}
              >
                Archive List
              </Button>
            </>
          )}

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
            }}
            className="text-left justify-start"
          >
            Delete List
          </Button>
        </>
      )}
    </div>
  );

  const actionsContent = (
    <div className="w-64 p-2">
      {menuView === "sort" && sortActionsContent}
      {menuView === "color" && colorActionsContent}
      {menuView === "move" && moveActionsContent}
      {menuView === "limit" && limitActionsContent}
      {menuView === "actions" && otherActionsContent}
      
      {menuView === "main" && (
        <div className="space-y-1">
          {/* Sort Cards Button */}
          <Button
            block
            size="small"
            onClick={() => setMenuView("sort")}
            className="text-left justify-start"
          >
            Sort by
          </Button>

          {/* List Color Button */}
          <Button
            block
            size="small"
            onClick={() => setMenuView("color")}
            className="text-left justify-start"
          >
            List Color
          </Button>

          {/* Other Actions Button */}
          {isSuperAdmin && (
            <>
              {/* Move All Cards Button */}
              {canMoveCard() && (
                <Button
                  block
                  size="small"
                  onClick={() => setMenuView("move")}
                  className="text-left justify-start"
                >
                  Move all cards
                </Button>
              )}

              {/* Card Limit Button */}
              <Button
                block
                size="small"
                onClick={() => setMenuView("limit")}
                className="text-left justify-start"
              >
                Card Limit
              </Button>

              <Button
                block
                size="small"
                danger
                onClick={() => setMenuView("actions")}
                className="text-left justify-start mt-2 border-t pt-2 rounded-t-none"
                style={{ marginTop: "0.5rem" }}
              >
                Archive / Delete
              </Button>
            </>
          )}
        </div>
      )}
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
          <div
            onClick={handleListNameClick}
            className="text-sm font-semibold cursor-pointer mt-0 mb-0 flex items-center"
            style={{
              color: "black",
            }}
          >
            {list.name}
            <span className="ml-2 font-semibold text-black" style={{ fontSize: '12px' }}>
              {safeLoadedCards} of {safeTotalCards}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-1">
          {onToggleCollapse && (
            <Tooltip title={"Collapse list"}>
              <Button
                type="text"
                size="small"
                className="flex items-center justify-center"
                style={{
                  color: getTextColor(),
                }}
                onClick={() => onToggleCollapse(list.id)}
              >
                <ChevronsLeft size={18} />
              </Button>
            </Tooltip>
          )}

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
            onOpenChange={handlePopoverOpenChange}
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

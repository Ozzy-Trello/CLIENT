import { FC, useMemo, useState, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getExpandedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { Button, Dropdown, Input, MenuProps, Checkbox } from "antd";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { useDebounce } from "@hooks/debounce";
import { IItemDashcard } from "@myTypes/card";
import { ItemType } from "antd/es/menu/interface";
import { useCardDetailContext } from "@providers/card-detail-context";
import MembersList from "@components/members-list";
import { useDashcardList } from "@hooks/dashcard-list";

type ColumnType = {
  type: string;
  column: string;
  value: string;
};

type DataType = {
  id: string;
  name: string;
  members: { id: string; name: string }[];
  description: string;
  columns: ColumnType[];
};

type ColumnSort = {
  id: string;
  desc: boolean;
};
type SortingState = ColumnSort[];

const TablePivot: FC = () => {
  const [grouping, setGrouping] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const { handleItemDashcard, itemDashcard } = useCardDetailContext();

  const globalFilter = useDebounce(searchValue, 300);

  useEffect(() => {
    setPageIndex(0);
  }, [searchValue]);

  const dynamicColumns = useMemo(() => {
    if (!itemDashcard.length) return [];

    const allColumns = new Set<string>();
    itemDashcard.forEach((item) => {
      item.columns.forEach((col) => {
        allColumns.add(col.column);
      });
    });

    const columns = Array.from(allColumns);

    setColumnVisibility((prev) => {
      const newVisibility = { ...prev };
      columns.forEach((col) => {
        if (newVisibility[col] === undefined) {
          newVisibility[col] = true;
        }
      });

      return newVisibility;
    });

    return columns;
  }, [itemDashcard]);

  console.log({ dynamicColumns });

  const columnVisibilityMenu = {
    items: dynamicColumns.map((columnId) => ({
      key: columnId,
      label: (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={columnVisibility[columnId] !== false}
            onChange={(e) => {
              setColumnVisibility((prev) => ({
                ...prev,
                [columnId]: e.target.checked,
              }));
            }}
          />
          <span>{columnId}</span>
        </div>
      ),
    })),
  };

  const handleMenuClick = (key: string, columnId: string) => {
    if (key === "pivot") {
      setGrouping((prev) => {
        const isAlreadyGrouped = prev.includes(columnId);
        if (isAlreadyGrouped) {
          return prev.filter((id) => id !== columnId);
        }
        return [...prev, columnId];
      });

      return;
    }
    if (key === "hide") {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: false,
      }));

      return;
    }

    if (key === "sort") {
      setSorting((prev) => {
        const existingSortItem = prev.find((item) => item.id === columnId);

        if (!existingSortItem) {
          return [...prev, { id: columnId, desc: false }];
        }

        if (!existingSortItem.desc) {
          return prev.map((item) => {
            if (item.id === columnId) {
              return { ...item, desc: true };
            }
            return item;
          });
        }

        return prev.filter((item) => item.id !== columnId);
      });

      return;
    }
  };

  const getColumnMenu = (columnId: string): MenuProps => {
    const currentSortStatus = sorting.find((item) => item.id === columnId);

    let sortLabel = "Sort";
    if (currentSortStatus) {
      sortLabel = currentSortStatus.desc ? "Remove Sort" : "Sort Descending";
    }

    return {
      items: [
        {
          key: "hide",
          label: "Hide",
          style: { display: columnId === "name" ? "none" : "block" },
        },
        {
          key: "sort",
          label: sortLabel,
        },
        {
          key: "pivot",
          label: grouping.includes(columnId) ? "Unpivot" : "Pivot",
          style: {
            display: dynamicColumns.includes(columnId) ? "block" : "none",
          },
        },
      ],
      onClick: ({ key }) => {
        handleMenuClick(key, columnId);
      },
    };
  };

  const pivotData = useMemo(() => {
    return itemDashcard.map((item) => {
      const pivotedItem: any = {
        id: item.id,
        name: item.name,
        listId: item.listId,
        boardId: item.boardId,
        members: item.member,
        description: item.description,
      };

      item.columns.forEach((col) => {
        pivotedItem[col.column] = col.value;
      });

      return pivotedItem;
    });
  }, [itemDashcard]);

  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => {
    const headerTemplate = (
      columnTitle: string,
      dropdownItems: ItemType[],
      onClick?: MenuProps["onClick"] | undefined
    ) => (
      <div
        className="flex items-center justify-between whitespace-nowrap"
        style={{ minWidth: "120px" }}
      >
        <span className="mr-4 text-ellipsis overflow-hidden">
          {columnTitle}
        </span>
        <Dropdown menu={{ items: dropdownItems, onClick }} trigger={["click"]}>
          <MoreHorizontal className="h-4 w-4 cursor-pointer flex-shrink-0" />
        </Dropdown>
      </div>
    );

    const handleRenderDynamicColumn = (
      id: string,
      column: string,
      value: string | boolean | number
    ) => {
      const findColumn = itemDashcard.find((item) => item.id === id);

      if (!findColumn) return value;

      const findColumnValue = findColumn.columns.find(
        (col) => col.column === column
      );

      if (!findColumnValue) return value;

      const type = findColumnValue.type;

      if (type === "text") {
        return value;
      }

      if (type === "checkbox") {
        return <Checkbox checked={value as boolean} />;
      }

      if (type === "date") {
        return new Intl.DateTimeFormat("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date(value as string));
      }

      return value;
    };

    const baseColumns = [
      columnHelper.accessor("name", {
        header: () =>
          headerTemplate(
            "Name",
            getColumnMenu("name").items || [],
            getColumnMenu("name").onClick
          ),
        cell: (info) => {
          const row = info.row;
          if (row.getIsGrouped()) {
            return `${row.subRows.length} items`;
          }
          return (
            <span
              className="cursor-pointer"
              onClick={() =>
                handleItemDashcard(
                  row.original.id,
                  row.original.listId,
                  row.original.boardId
                )
              }
            >
              {info.getValue()}
            </span>
          );
        },
      }),
      columnHelper.accessor("members", {
        header: () =>
          headerTemplate(
            "Members",
            getColumnMenu("members").items || [],
            getColumnMenu("members").onClick
          ),
        cell: (info) => {
          const row = info.row;
          if (row.getIsGrouped()) {
            return `${row.subRows.length} items`;
          }
          const members = (info.row.original as DataType).members;
          return (
            <div className="flex flex-wrap gap-1">
              <MembersList
                members={members || []}
                membersLength={members?.length || 0}
                membersLoopLimit={3}
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("description", {
        header: () =>
          headerTemplate(
            "Description",
            getColumnMenu("description").items || [],
            getColumnMenu("description").onClick
          ),
        cell: (info) => {
          const row = info.row;
          if (row.getIsGrouped()) {
            return `${row.subRows.length} items`;
          }
          return info.getValue();
        },
      }),
    ];

    // Add dynamic columns from all unique columns collected
    const dynamicColumnsDefinitions =
      dynamicColumns.map((columnName) =>
        columnHelper.accessor(columnName, {
          header: () =>
            headerTemplate(
              columnName.charAt(0).toUpperCase() + columnName.slice(1),
              getColumnMenu(columnName).items || [],
              getColumnMenu(columnName).onClick
            ),
          cell: (info) => {
            const row = info.row;
            const currentGroupIndex = grouping.indexOf(columnName);

            const getTotalUniqueValues = (
              row: any,
              columnId: string
            ): number => {
              if (!row.subRows || row.subRows.length === 0) {
                return 0;
              }

              if (row.subRows.every((r: any) => !r.subRows)) {
                return row.subRows.length;
              }
              return Math.max(
                ...row.subRows.map((subRow: any) =>
                  getTotalUniqueValues(subRow, columnId)
                )
              );
            };

            if (row.getIsGrouped()) {
              if (grouping.includes(columnName)) {
                if (row.depth !== currentGroupIndex) {
                  return "";
                }

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        row.getToggleExpandedHandler()();
                      }}
                      className="cursor-pointer"
                    >
                      {row.getIsExpanded() ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {handleRenderDynamicColumn(
                      row.original.id,
                      columnName,
                      info.getValue()
                    )}
                  </div>
                );
              }

              const itemCount = getTotalUniqueValues(row, columnName);

              if (itemCount === 0) {
                return `${row.subRows.length} items`;
              }
              return `${itemCount} items`;
            }

            return handleRenderDynamicColumn(
              row.original.id,
              columnName,
              info.getValue()
            );
          },
          aggregatedCell: (info) => {
            const row = info.row;
            const currentGroupIndex = grouping.indexOf(columnName);

            const getTotalUniqueValues = (
              row: any,
              columnId: string
            ): number => {
              if (!row.subRows || row.subRows.length === 0) {
                return 0;
              }

              if (row.subRows.every((r: any) => !r.subRows)) {
                return row.subRows.length;
              }
              return Math.max(
                ...row.subRows.map((subRow: any) =>
                  getTotalUniqueValues(subRow, columnId)
                )
              );
            };

            if (grouping.includes(columnName)) {
              if (row.depth !== currentGroupIndex) {
                return "";
              }
              return info.getValue();
            }

            const itemCount = getTotalUniqueValues(row, columnName);

            if (itemCount === 0) {
              return `${row.subRows.length} items`;
            }

            return `${itemCount} items`;
          },
        })
      ) || [];

    return [...baseColumns, ...dynamicColumnsDefinitions];
  }, [itemDashcard, grouping, sorting]);

  const table = useReactTable({
    data: pivotData,
    columns,
    state: {
      grouping,
      expanded,
      globalFilter,
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
      columnVisibility,
    },
    onExpandedChange: (value) => setExpanded(value as Record<string, boolean>),
    onColumnVisibilityChange: setColumnVisibility,
    getExpandedRowModel: getExpandedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
  });

  useEffect(() => {
    const handlePageSize = () => {
      if (grouping.length > 0) {
        setPageSize(table.getRowCount());
        return;
      }

      if (grouping.length === 0) {
        setPageSize(10);
      }
    };

    handlePageSize();
  }, [grouping, table.getRowCount()]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-3 items-center">
        <div>
          <Input
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-64"
          />
        </div>
        <div>
          <Dropdown
            menu={columnVisibilityMenu}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button>Columns</Button>
          </Dropdown>
        </div>
      </div>
      <div style={{ paddingBottom: "1rem" }} className="overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider break-words"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={row.getIsGrouped() ? "bg-gray-50" : ""}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 text-sm text-gray-500 break-words"
                    style={{ maxWidth: "200px", minWidth: "150px" }}
                    {...{
                      colSpan: cell.column.getIsGrouped() ? 1 : undefined,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Show pagination only when no columns are pivoted */}
      {grouping.length === 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              disabled={!table.getCanPreviousPage()}
              onClick={() =>
                setPageIndex(table.getState().pagination.pageIndex - 1)
              }
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              disabled={!table.getCanNextPage()}
              onClick={() =>
                setPageIndex(table.getState().pagination.pageIndex + 1)
              }
            >
              Next
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              {table.getPrePaginationRowModel().rows.length} items
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablePivot;

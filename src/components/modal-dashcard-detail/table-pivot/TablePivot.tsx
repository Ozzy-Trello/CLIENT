import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Checkbox, Dropdown, MenuProps, message } from "antd";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { ItemType } from "antd/es/menu/interface";
import { useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { useDebounce } from "@hooks/debounce";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCustomFields } from "@hooks/custom_field";
import { selectCurrentWorkspace } from "@store/workspace_slice";
import MembersList from "@components/members-list";
import { LookupCache } from "@utils/lookup-cache";
import PivotTable from "./components/PivotTable";
import PivotToolbar from "./components/PivotToolbar";
import PivotPagination from "./components/PivotPagination";
import { usePivotData } from "./hooks/usePivotData";
import { usePivotColumns } from "./hooks/usePivotColumns";
import ColumnsDropdown from "./components/ColumnsDropdown";

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

const humanizeColumnId = (columnId: string) =>
  columnId
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const TablePivot: FC = () => {
  const [grouping, setGrouping] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isSavingColumns, setIsSavingColumns] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [lastSavedVisibility, setLastSavedVisibility] = useState<Record<string, boolean>>({});
  const [lastSavedOrder, setLastSavedOrder] = useState<string[]>([]);

  const { processedItemDashcard, dashcardConfig, saveColumnsConfig } = useCardDetailContext();

  const baseColumnIds = useMemo(() => {
    const base = [
      "bahanInfo",
      "createdAt",
      "description",
      "dueDate",
      "listName",
      "members",
      "productInfo",
      "warnaInfo",
    ];
    const sorted = base.sort((a, b) => humanizeColumnId(a).localeCompare(humanizeColumnId(b)));
    return ["name", ...sorted];
  }, []);

  const { workspaceId } = useParams();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId || currentWorkspace?.id;

  const { customFields } = useCustomFields(currentWorkspaceId || "");
  const globalFilter = useDebounce(searchValue, 300);

  useEffect(() => {
    setPageIndex(0);
  }, [searchValue]);

  const dynamicColumns = useMemo(() => {
    const dashcardColumns = new Set<string>();
    processedItemDashcard.forEach((item) => {
      item.columns.forEach((col) => {
        dashcardColumns.add(col.column);
      });
    });

    const workspaceCustomFields = new Set<string>();
    if (customFields && customFields.length > 0) {
      customFields.forEach((field) => {
        workspaceCustomFields.add(field.name);
      });
    }

    const combined = Array.from(new Set([...Array.from(dashcardColumns), ...Array.from(workspaceCustomFields)]));
    return combined
  }, [processedItemDashcard, customFields]);

  const pivotData = usePivotData(processedItemDashcard, customFields);

  const columnHelper = createColumnHelper<any>();

  const {
    columnVisibility,
    setColumnVisibility,
    setColumnOrder,
    columnSearchValue,
    setColumnSearchValue,
    columnsDropdownOpen,
    setColumnsDropdownOpen,
    filteredColumns,
    effectiveColumnOrder,
    allColumnIds,
    handleHeaderDragStart,
    handleHeaderDrop,
    handleMenuDragEnd,
  } = usePivotColumns({
    baseColumnIds,
    dynamicColumns,
    dashcardConfig,
    updateVisibleColumns: () => { },
    updateColumnOrder: () => { },
    autoPersist: false,
  });

  const arraysEqual = useCallback(
    (a: string[], b: string[]) => a.length === b.length && a.every((val, idx) => val === b[idx]),
    []
  );

  const mergeColumnOrder = useCallback(
    (orderSource: string[]) => {
      const filtered = orderSource.filter((id) => allColumnIds.includes(id));
      const missing = allColumnIds.filter((id) => !filtered.includes(id));
      return [...filtered, ...missing];
    },
    [allColumnIds]
  );

  useEffect(() => {
    if (!allColumnIds.length) return;

    setLastSavedVisibility((prev) => {
      const savedVisibleColumns = dashcardConfig?.visibleColumns;
      const next: Record<string, boolean> = {};
      allColumnIds.forEach((col) => {
        next[col] = savedVisibleColumns ? savedVisibleColumns.includes(col) : baseColumnIds.includes(col);
      });
      const unchanged =
        Object.keys(prev).length === Object.keys(next).length &&
        allColumnIds.every((id) => prev[id] === next[id]);
      return unchanged ? prev : next;
    });

    setLastSavedOrder((prev) => {
      const source = dashcardConfig?.columnOrder?.length
        ? dashcardConfig.columnOrder
        : dashcardConfig?.visibleColumns ?? [];
      const next = mergeColumnOrder(source).filter(
        (id) => !dashcardConfig?.visibleColumns?.length || dashcardConfig.visibleColumns.includes(id)
      );
      return arraysEqual(prev, next) ? prev : next;
    });
  }, [
    allColumnIds,
    baseColumnIds,
    dashcardConfig?.visibleColumns,
    dashcardConfig?.columnOrder,
    mergeColumnOrder,
    arraysEqual,
  ]);


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
      setColumnVisibility((prev) => ({ ...prev, [columnId]: false }));
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
        },
      ],
      onClick: ({ key }) => {
        handleMenuClick(key, columnId);
      },
    };
  };

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
        <span className="mr-4 text-ellipsis overflow-hidden">{columnTitle}</span>
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
      const formatNumberValue = (raw: any) => {
        const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").trim());
        if (!Number.isFinite(num)) return raw;
        return Number(num.toFixed(6)).toString();
      };

      const findColumn = processedItemDashcard.find((item) => item.id === id);

      if (!findColumn) {
        const humanValue = LookupCache.any(String(value));
        return humanValue || value;
      }

      const findColumnValue = findColumn.columns.find((col) => col.column === column);

      if (!findColumnValue) {
        const humanValue = LookupCache.any(String(value));
        return humanValue || value;
      }

      const type = findColumnValue.type;

      if (type === "text") {
        const humanValue = LookupCache.any(String(value));
        return humanValue || value;
      }

      if (type === "number") {
        return formatNumberValue(value);
      }

      if (type === "checkbox") {
        return <Checkbox checked={value as boolean} />;
      }

      if (type === "date") {
        if (!value) return "-";
        const parsed = new Date(value as string);
        if (isNaN(parsed.getTime())) return "-";
        return new Intl.DateTimeFormat("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(parsed);
      }

      const humanValue = LookupCache.any(String(value));
      return humanValue || value;
    };

    const formatDate = (value: string | Date | number | null | undefined) => {
      if (!value && value !== 0) return "-";
      const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
      if (!date || isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    };

    const renderGroupedCell = (columnId: string, row: any, renderer: () => ReactNode) => {
      const groupIndex = grouping.indexOf(columnId);
      if (row.getIsGrouped()) {
        if (groupIndex !== -1 && row.depth === groupIndex) {
          return (
            <div className="flex items-center gap-2">
              <button onClick={() => row.getToggleExpandedHandler()()} className="cursor-pointer">
                {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {renderer()}
              <span className="text-xs text-gray-400">({row.subRows.length})</span>
            </div>
          );
        }
        return "";
      }
      return renderer();
    };

    const baseColumns = [
      columnHelper.accessor("name", {
        header: () =>
          headerTemplate("Name", getColumnMenu("name").items || [], getColumnMenu("name").onClick),
        cell: (info) => {
          const row = info.row;
          const openInNewTab = () => {
            if (typeof window === "undefined") return;
            const workspaceSegment = currentWorkspaceId || "";
            const url = `/workspace/${workspaceSegment}/board/${row.original.boardId}?cardId=${row.original.id}&listId=${row.original.listId}`;
            window.open(url, "_blank");
          };

          return renderGroupedCell("name", row, () => (
            <span className="cursor-pointer" onClick={openInNewTab}>
              {info.getValue()}
            </span>
          ));
        },
      }),
      columnHelper.accessor("listName", {
        header: () =>
          headerTemplate("List", getColumnMenu("listName").items || [], getColumnMenu("listName").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("listName", row, () => <span>{row.original.listName || "-"}</span>);
        },
      }),
      columnHelper.accessor("members", {
        header: () =>
          headerTemplate("Members", getColumnMenu("members").items || [], getColumnMenu("members").onClick),
        cell: (info) => {
          const row = info.row;
          const members = (info.row.original as DataType).members;
          return renderGroupedCell("members", row, () => (
            <div className="flex flex-wrap gap-1">
              <MembersList members={members || []} membersLength={members?.length || 0} membersLoopLimit={3} />
            </div>
          ));
        },
      }),
      columnHelper.accessor("description", {
        header: () =>
          headerTemplate("Description", getColumnMenu("description").items || [], getColumnMenu("description").onClick),
        cell: (info) => {
          const row = info.row;
          const description = info.getValue() as string;
          return renderGroupedCell("description", row, () => (
            <div dangerouslySetInnerHTML={{ __html: description || "" }} className="max-w-xs overflow-hidden" />
          ));
        },
      }),
      columnHelper.accessor("productInfo", {
        header: () =>
          headerTemplate("Produk", getColumnMenu("productInfo").items || [], getColumnMenu("productInfo").onClick),
        cell: (info) => {
          const row = info.row;
          const productInfo = info.getValue() as any;
          return renderGroupedCell("productInfo", row, () => (
            <div className="max-w-xs truncate">{productInfo?.name || "-"}</div>
          ));
        },
      }),
      columnHelper.accessor("bahanInfo", {
        header: () =>
          headerTemplate("Bahan", getColumnMenu("bahanInfo").items || [], getColumnMenu("bahanInfo").onClick),
        cell: (info) => {
          const row = info.row;
          const bahanInfo = info.getValue() as any;
          return renderGroupedCell("bahanInfo", row, () => (
            <div className="max-w-xs truncate">{bahanInfo?.name || "-"}</div>
          ));
        },
      }),
      columnHelper.accessor("warnaInfo", {
        header: () =>
          headerTemplate("Warna", getColumnMenu("warnaInfo").items || [], getColumnMenu("warnaInfo").onClick),
        cell: (info) => {
          const row = info.row;
          const warnaInfo = info.getValue() as any;
          return renderGroupedCell("warnaInfo", row, () => (
            <div className="max-w-xs truncate">{warnaInfo?.name || "-"}</div>
          ));
        },
      }),
      columnHelper.accessor("dueDate", {
        header: () =>
          headerTemplate("Due Date", getColumnMenu("dueDate").items || [], getColumnMenu("dueDate").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("dueDate", row, () => formatDate(info.getValue() as any));
        },
      }),
      columnHelper.accessor("createdAt", {
        header: () =>
          headerTemplate("Created Date", getColumnMenu("createdAt").items || [], getColumnMenu("createdAt").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("createdAt", row, () => formatDate(info.getValue() as any));
        },
      }),
    ];

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
            return renderGroupedCell(columnName, row, () =>
              handleRenderDynamicColumn(row.original.id, columnName, info.getValue())
            );
          },
          aggregatedCell: (info) => {
            const row = info.row;
            return renderGroupedCell(columnName, row, () =>
              handleRenderDynamicColumn(row.original.id, columnName, info.getValue())
            );
          },
        })
      ) || [];

    return [...baseColumns, ...dynamicColumnsDefinitions];
  }, [processedItemDashcard, grouping, sorting, dynamicColumns, currentWorkspaceId]);



  const visibleColumnsOrdered = useMemo(
    () => effectiveColumnOrder.filter((col) => columnVisibility[col] === true),
    [effectiveColumnOrder, columnVisibility]
  );


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
      columnOrder: visibleColumnsOrdered,
    },
    onExpandedChange: (value) => setExpanded(value as Record<string, boolean>),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getExpandedRowModel: getExpandedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
  });


  const hasSavedVisibility = allColumnIds.every((id) =>
    Object.prototype.hasOwnProperty.call(lastSavedVisibility, id)
  );
  const hasVisibilityChanges = hasSavedVisibility
    ? allColumnIds.some(
        (id) => (columnVisibility[id] === true) !== (lastSavedVisibility[id] === true)
      )
    : false;
  const hasOrderChanges = lastSavedOrder.length
    ? !arraysEqual(visibleColumnsOrdered, lastSavedOrder)
    : false;
  const hasUnsavedChanges = hasVisibilityChanges || hasOrderChanges;

  const rowCount = table.getRowCount();

  const exportToExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const allColumnsForExport = Array.from(new Set([...baseColumnIds, ...dynamicColumns]));
    const visibleColumns = allColumnsForExport.filter((col) => columnVisibility[col] !== false);

    const headers = [...visibleColumns.map(humanizeColumnId), "URL"];
    const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

    const excelData = table.getFilteredRowModel().rows.map((row) => {
      const rowData: any = {};

      visibleColumns.forEach((col) => {
        const value = row.original[col];

        switch (col) {
          case "name":
            rowData[humanizeColumnId(col)] = value || "";
            break;
          case "members":
            rowData[humanizeColumnId(col)] =
              value && Array.isArray(value)
                ? value
                  .map(
                    (member: any) =>
                      LookupCache.label("user", member.id) || member.name || member.id
                  )
                  .join(", ")
                : "";
            break;
          case "description":
            rowData[humanizeColumnId(col)] = value ? stripHtml(value as string) : "";
            break;
          case "dueDate":
          case "createdAt":
            if (!value && value !== 0) {
              rowData[humanizeColumnId(col)] = "";
              break;
            }
            {
              const parsed = new Date(value as string);
              rowData[humanizeColumnId(col)] = isNaN(parsed.getTime())
                ? ""
                : parsed.toLocaleDateString();
            }
            break;
          case "productInfo":
          case "bahanInfo":
          case "warnaInfo":
            rowData[humanizeColumnId(col)] =
              (value as any)?.name || (value as any)?.label || "";
            break;
          default: {
            if (value === null || value === undefined) {
              rowData[humanizeColumnId(col)] = "";
            } else if (typeof value === "string") {
              const cachedValue = LookupCache.any(value);
              rowData[humanizeColumnId(col)] = cachedValue || value;
            } else if (Array.isArray(value)) {
              rowData[humanizeColumnId(col)] = value
                .map((v) => {
                  if (typeof v === "string") {
                    return LookupCache.any(v) || v;
                  }
                  return String(v);
                })
                .join(", ");
            } else if (typeof value === "boolean") {
              rowData[humanizeColumnId(col)] = value ? "Yes" : "No";
            } else {
              rowData[humanizeColumnId(col)] = String(value);
            }
          }
        }
      });

      const cardData = row.original;
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      rowData["URL"] = `${baseUrl}/workspace/${currentWorkspaceId}/board/${cardData.boardId}?listId=${cardData.listId}&cardId=${cardData.id}`;

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Table Data");

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `table-export-${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);
  }, [baseColumnIds, dynamicColumns, columnVisibility, table, currentWorkspaceId]);

  useEffect(() => {
    const next = grouping.length > 0 ? rowCount : 10;
    setPageSize((prev) => (prev === next ? prev : next));
  }, [grouping.length, rowCount]);

  useEffect(() => {
    if (saveSucceeded && hasUnsavedChanges) {
      setSaveSucceeded(false);
    }
  }, [hasUnsavedChanges, saveSucceeded]);

  const handleSaveColumns = useCallback(async () => {
    setIsSavingColumns(true);
    try {
      await saveColumnsConfig(visibleColumnsOrdered, visibleColumnsOrdered);
      setLastSavedVisibility(columnVisibility);
      setLastSavedOrder(visibleColumnsOrdered);
      setSaveSucceeded(true);
      setColumnsDropdownOpen(false);
    } catch (error) {
      message.error("Failed to save column settings");
    } finally {
      setIsSavingColumns(false);
    }
  }, [
    columnVisibility,
    visibleColumnsOrdered,
    saveColumnsConfig,
    setColumnsDropdownOpen,
  ]);

  const columnsDropdownContent = useMemo(
    () => (
      <ColumnsDropdown
        filteredColumns={filteredColumns}
        columnVisibility={columnVisibility}
        onToggle={(columnId, visible) =>
          setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
        }
        columnSearchValue={columnSearchValue}
        onSearchChange={setColumnSearchValue}
        onDragEnd={handleMenuDragEnd}
        humanizeColumnId={humanizeColumnId}
      />
    ),
    [
      filteredColumns,
      columnVisibility,
      columnSearchValue,
      handleMenuDragEnd,
      setColumnVisibility,
      setColumnSearchValue,
    ]
  );

  return (
    <div className="flex flex-col gap-3">
      <PivotToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onExport={exportToExcel}
        columnsDropdownContent={columnsDropdownContent}
        columnsDropdownOpen={columnsDropdownOpen}
        onColumnsDropdownChange={setColumnsDropdownOpen}
        onSave={handleSaveColumns}
        saveDisabled={!hasUnsavedChanges}
        saveLoading={isSavingColumns}
        saveSucceeded={saveSucceeded}
      />
      <PivotTable
        table={table}
        onHeaderDragStart={handleHeaderDragStart}
        onHeaderDrop={handleHeaderDrop}
      />
      {grouping.length === 0 && (
        <PivotPagination
          table={table}
          onPrev={() => setPageIndex(table.getState().pagination.pageIndex - 1)}
          onNext={() => setPageIndex(table.getState().pagination.pageIndex + 1)}
        />
      )}
    </div>
  );
};

export default TablePivot;

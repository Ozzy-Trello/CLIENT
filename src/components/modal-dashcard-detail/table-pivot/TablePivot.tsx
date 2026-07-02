import { FC, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
import { usePermissions } from "@hooks/account";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCustomFields } from "@hooks/custom_field";
import { selectCurrentWorkspace } from "@store/workspace_slice";
import MembersList from "@components/members-list";
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
  board?: string;
  boardId: string;
  listId: string;
  listName?: string;
  members: { id: string; name: string }[];
  description: string;
  columns: ColumnType[];
};

type ColumnSort = {
  id: string;
  desc: boolean;
};
type SortingState = ColumnSort[];

const normalizeDateGroupKey = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  const date =
    typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : value instanceof Date
        ? value
        : null;
  if (!date || isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const humanizeColumnId = (columnId: string) => {
  const cleaned = columnId.replace(/[_\s]+/g, " ").trim();
  const withBoundaries = cleaned
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  const normalized = withBoundaries.replace(/\s+/g, " ");
  return normalized ? normalized.replace(/^./, (c) => c.toUpperCase()) : "";
};

const TablePivot: FC = () => {
  const [grouping, setGrouping] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeChoice, setPageSizeChoice] = useState<"all" | "10" | "20" | "50" | "100">("10");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isSavingColumns, setIsSavingColumns] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const [lastSavedVisibility, setLastSavedVisibility] = useState<Record<string, boolean>>({});
  const [lastSavedOrder, setLastSavedOrder] = useState<string[]>([]);

  const { isSuperAdmin } = usePermissions();
  const isSuperAdminUser = isSuperAdmin();

  const { processedItemDashcard, dashcardConfig, saveColumnsConfig } = useCardDetailContext();

  const baseColumnIds = useMemo(() => {
    const base = [
      "bahanInfo",
      "board",
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

  const dateColumnNames = useMemo(() => {
    const dateColumns = new Set<string>();
    processedItemDashcard.forEach((item) => {
      item.columns.forEach((col: any) => {
        if (col.type === "date") {
          dateColumns.add(col.column);
        }
      });
    });
    return dateColumns;
  }, [processedItemDashcard]);

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
        // Backend now sends resolved names, not IDs - just return the value
        return value;
      }

      const findColumnValue = findColumn.columns.find((col) => col.column === column);

      if (!findColumnValue) {
        // Backend now sends resolved names, not IDs - just return the value
        return value;
      }

      const type = findColumnValue.type;

      if (type === "text") {
        // Backend now sends resolved names for user fields, etc.
        return value;
      }

      if (type === "number") {
        return formatNumberValue(value);
      }

      if (type === "checkbox") {
        return <Checkbox checked={value as boolean} />;
      }

      if (type === "date") {
        return formatDate(value as any);
      }

      // For dropdown and other types, backend now sends labels not IDs
      return value;
    };

    const formatDate = (value: string | Date | number | null | undefined) => {
      if (!value && value !== 0) return "-";
      const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
      if (!date || isNaN(date.getTime())) return "-";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
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
          headerTemplate(
            "Name",
            getColumnMenu("name").items || [],
            getColumnMenu("name").onClick
          ),
        cell: (info) => {
          const row = info.row;

          const workspaceSegment = currentWorkspaceId || "";
          const url = `/workspace/${workspaceSegment}/board/${row.original.boardId}?cardId=${row.original.id}&listId=${row.original.listId}`;

          const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
            // Let the browser handle:
            // - right click context menu
            // - middle click
            // - cmd/ctrl click
            // - shift click
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }

            // Optional: if you want to open in a new tab even on normal left-click:
            // event.preventDefault();
            // window.open(url, "_blank", "noopener,noreferrer");
          };

          return renderGroupedCell("name", row, () => (
            <a
              href={url}
              className="cursor-pointer"
              onClick={handleClick}
            // optional: always open left-click in new tab natively
            // target="_blank"
            // rel="noopener noreferrer"
            >
              {info.getValue()}
            </a>
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
      columnHelper.accessor("board", {
        header: () =>
          headerTemplate("Board", getColumnMenu("board").items || [], getColumnMenu("board").onClick),
        cell: (info) => {
          const row = info.row;
          const boardName = info.getValue() as string;
          return renderGroupedCell("board", row, () => <span>{boardName || "-"}</span>);
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
      columnHelper.accessor((row) => row.productInfo?.name || "", {
        id: "productInfo",
        header: () =>
          headerTemplate("Produk", getColumnMenu("productInfo").items || [], getColumnMenu("productInfo").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("productInfo", row, () => (
            <div className="max-w-xs truncate">{info.getValue() || "-"}</div>
          ));
        },
      }),
      columnHelper.accessor((row) => row.bahanInfo?.name || "", {
        id: "bahanInfo",
        header: () =>
          headerTemplate("Bahan", getColumnMenu("bahanInfo").items || [], getColumnMenu("bahanInfo").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("bahanInfo", row, () => (
            <div className="max-w-xs truncate">{info.getValue() || "-"}</div>
          ));
        },
      }),
      columnHelper.accessor((row) => row.warnaInfo?.name || "", {
        id: "warnaInfo",
        header: () =>
          headerTemplate("Warna", getColumnMenu("warnaInfo").items || [], getColumnMenu("warnaInfo").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("warnaInfo", row, () => (
            <div className="max-w-xs truncate">{info.getValue() || "-"}</div>
          ));
        },
      }),
      columnHelper.accessor("dueDate", {
        getGroupingValue: (row) => normalizeDateGroupKey(row.dueDate),
        header: () =>
          headerTemplate("Due Date", getColumnMenu("dueDate").items || [], getColumnMenu("dueDate").onClick),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("dueDate", row, () => formatDate(info.getValue() as any));
        },
      }),
      columnHelper.accessor("createdAt", {
        getGroupingValue: (row) => normalizeDateGroupKey(row.createdAt),
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
          ...(dateColumnNames.has(columnName)
            ? { getGroupingValue: (row: any) => normalizeDateGroupKey(row[columnName]) }
            : {}),
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
  }, [processedItemDashcard, grouping, sorting, dynamicColumns, dateColumnNames, currentWorkspaceId]);



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
    onGroupingChange: setGrouping,
    onSortingChange: setSorting,
    globalFilterFn: "auto",
    getExpandedRowModel: getExpandedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
  const pageSizeOptions = useMemo(
    () => [
      { label: "All", value: "all" },
      { label: "10", value: "10" },
      { label: "20", value: "20" },
      { label: "50", value: "50" },
      { label: "100", value: "100" },
    ],
    []
  );

  const exportToExcel = useCallback(async () => {
    console.log("[TablePivot] Export to Excel triggered");
    const orderedColumns =
      visibleColumnsOrdered.length > 0
        ? visibleColumnsOrdered
        : allColumnIds.filter((col) => columnVisibility[col] !== false);
    const exportColumns = ["name", "URL", ...orderedColumns.filter((col) => col !== "name")];

    const headers = exportColumns.map((col) => (col === "URL" ? "URL" : humanizeColumnId(col)));
    const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");
    const stripJmlTrailingZeros = (columnId: string, rawValue: any) => {
      if (!columnId.toLowerCase().includes("jml")) return rawValue;
      if (rawValue === null || rawValue === undefined) return rawValue;
      const asString = String(rawValue);
      const trimmed = asString.replace(/\.0+$/, "");
      if (trimmed === asString) return rawValue;
      const asNumber = Number(trimmed);
      return Number.isFinite(asNumber) ? asNumber : trimmed;
    };
    const sanitizeFilename = (name: string) =>
      name.replace(/[\\\\/:*?"<>|]/g, "").trim() || "dashcard";

    const excelRows = table.getFilteredRowModel().rows.map((row) => {
      const cardData = row.original;
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const cardUrl = `${baseUrl}/workspace/${currentWorkspaceId}/board/${cardData.boardId}?listId=${cardData.listId}&cardId=${cardData.id}`;

      return exportColumns.map((col) => {
        if (col === "URL") {
          return cardUrl;
        }

        const value = cardData[col];

        switch (col) {
          case "name":
            return stripJmlTrailingZeros(col, value || "");
          case "members":
            return stripJmlTrailingZeros(
              col,
              value && Array.isArray(value)
                ? value
                  .map(
                    (member: any) =>
                      // Backend now sends member.name (username) directly
                      member.name || member.id
                  )
                  .join(", ")
                : ""
            );
          case "description":
            return stripJmlTrailingZeros(col, value ? stripHtml(value as string) : "");
          case "dueDate":
          case "createdAt":
            if (!value && value !== 0) {
              return "";
            }
            {
              const parsed = new Date(value as string);
              if (isNaN(parsed.getTime())) {
                return "";
              }
              const day = String(parsed.getDate()).padStart(2, "0");
              const month = String(parsed.getMonth() + 1).padStart(2, "0");
              const year = parsed.getFullYear();
              return stripJmlTrailingZeros(col, `${day}/${month}/${year}`);
            }
          case "productInfo":
          case "bahanInfo":
          case "warnaInfo":
            return stripJmlTrailingZeros(
              col,
              (value as any)?.name || (value as any)?.label || ""
            );
          default: {
            if (value === null || value === undefined) {
              return "";
            }
            
            // Check if this column is a date type custom field
            const columnMeta = cardData.columns?.find((c: any) => c.column === col);
            const isDateType = columnMeta?.type === "date";
            
            if (isDateType && value) {
              const parsed = new Date(value as string);
              if (!isNaN(parsed.getTime())) {
                const day = String(parsed.getDate()).padStart(2, "0");
                const month = String(parsed.getMonth() + 1).padStart(2, "0");
                const year = parsed.getFullYear();
                return stripJmlTrailingZeros(col, `${day}/${month}/${year}`);
              }
            }
            
            if (typeof value === "string") {
              // Backend now sends resolved names, not IDs
              return stripJmlTrailingZeros(col, value);
            }
            if (Array.isArray(value)) {
              return stripJmlTrailingZeros(
                col,
                value
                  .map((v) => {
                    // Backend now sends resolved names
                    return String(v);
                  })
                  .join(", ")
              );
            }
            if (typeof value === "boolean") {
              return stripJmlTrailingZeros(col, value ? "Yes" : "No");
            }
            return stripJmlTrailingZeros(col, String(value));
          }
        }
      });
    });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const safeName = sanitizeFilename(dashcardConfig?.name || "dashcard");
    const filename = `${safeName}-${timestamp}.csv`;

    const escapeCsv = (val: any) => {
      const str = val === null || val === undefined ? "" : String(val);
      if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    try {
      const csvContent = [headers, ...excelRows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      console.log("[TablePivot] Export to CSV completed:", filename);
    } catch (error) {
      console.error("[TablePivot] Export to CSV failed:", error);
      message.error("Failed to export CSV");
    }
  }, [
    visibleColumnsOrdered,
    allColumnIds,
    columnVisibility,
    table,
    currentWorkspaceId,
    dashcardConfig?.name,
  ]);

  useEffect(() => {
    const desired =
      pageSizeChoice === "all" ? rowCount || 100000 : Number(pageSizeChoice);
    if (desired && desired !== pageSize) {
      setPageSize(desired);
      setPageIndex(0);
    }
  }, [pageSizeChoice, rowCount, pageSize]);

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
        isSuperAdmin={isSuperAdminUser}
      />
      <PivotTable
        table={table}
        onHeaderDragStart={handleHeaderDragStart}
        onHeaderDrop={handleHeaderDrop}
      />
      <PivotPagination
        table={table}
        onPrev={() => setPageIndex(table.getState().pagination.pageIndex - 1)}
        onNext={() => setPageIndex(table.getState().pagination.pageIndex + 1)}
        pageSizeChoice={pageSizeChoice}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={(val) => {
          setPageSizeChoice(val as any);
        }}
      />
    </div>
  );
};

export default TablePivot;

import { FC, useMemo, useState, useEffect, useCallback, DragEvent, useRef } from "react";
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
import { AnyList } from "@myTypes/list";
import { Card } from "@myTypes/card";
import { Button, Dropdown, Input, MenuProps, Checkbox } from "antd";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Download } from "lucide-react";
import { useDebounce } from "@hooks/debounce";
import { ItemType } from "antd/es/menu/interface";
import { useCardDetailContext } from "@providers/card-detail-context";
import MembersList from "@components/members-list";
import { useParams } from "next/navigation";
import { useCustomFields } from "@hooks/custom_field";
import { LookupCache } from "@utils/lookup-cache";
import { useSelector } from "react-redux";
import { selectCurrentWorkspace } from "@store/workspace_slice";
import dynamic from "next/dynamic";
import { Draggable, Droppable, DropResult } from "@hello-pangea/dnd";

const DragDropContext = dynamic(
  () => import("@hello-pangea/dnd").then((mod) => mod.DragDropContext),
  { ssr: false }
);

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
const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((val, idx) => val === b[idx]);

const TablePivot: FC = () => {
  const [grouping, setGrouping] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchValue, setSearchValue] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);
  const [columnSearchValue, setColumnSearchValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const tableRef = useRef<ReturnType<typeof useReactTable> | null>(null);
  const {
    openCardDetail,
    processedItemDashcard,
    dashcardConfig,
    updateVisibleColumns,
    updateColumnOrder,
  } = useCardDetailContext();
  const baseColumnIds = useMemo(
    () => [
      "name",
      "listName",
      "members",
      "description",
      "productInfo",
      "bahanInfo",
      "warnaInfo",
      "dueDate",
      "createdAt",
    ],
    []
  );

  // Get workspace ID from URL params and Redux store
  const { workspaceId } = useParams();
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentWorkspaceId = Array.isArray(workspaceId)
    ? workspaceId[0]
    : workspaceId || currentWorkspace?.id;

  // Fetch all custom fields for the workspace
  const { customFields } = useCustomFields(currentWorkspaceId || "");

  const globalFilter = useDebounce(searchValue, 300);

  useEffect(() => {
    setPageIndex(0);
  }, [searchValue]);

  const dynamicColumns = useMemo(() => {
    // Get columns from dashcard data
    const dashcardColumns = new Set<string>();
    processedItemDashcard.forEach((item) => {
      item.columns.forEach((col) => {
        dashcardColumns.add(col.column);
      });
    });

    // Get all custom fields from workspace
    const workspaceCustomFields = new Set<string>();
    if (customFields && customFields.length > 0) {
      customFields.forEach((field) => {
        workspaceCustomFields.add(field.name);
      });
    }

    // Combine both sets to get all possible columns
    const allColumns = new Set([
      ...Array.from(dashcardColumns),
      ...Array.from(workspaceCustomFields),
    ]);
    const columns = Array.from(allColumns);
    return columns;
  }, [processedItemDashcard, customFields]);

  useEffect(() => {
    const savedVisibleColumns = dashcardConfig?.visibleColumns;
    const columns = dynamicColumns;

    setColumnVisibility((prev) => {
      const newVisibility = { ...prev };
      const allIds = [...baseColumnIds, ...columns];
      let changed = false;

      allIds.forEach((col) => {
        const nextVal = savedVisibleColumns
          ? savedVisibleColumns.includes(col)
          : newVisibility[col] !== undefined
          ? newVisibility[col]
          : baseColumnIds.includes(col);

        if (newVisibility[col] !== nextVal) {
          newVisibility[col] = nextVal;
          changed = true;
        }
      });

      return changed ? newVisibility : prev;
    });
  }, [dynamicColumns, baseColumnIds, dashcardConfig?.visibleColumns]);

  const allColumnIds = useMemo(
    () => [...baseColumnIds, ...dynamicColumns],
    [baseColumnIds, dynamicColumns]
  );

  const preferredColumnOrder = useMemo(() => {
    if (dashcardConfig?.columnOrder?.length) {
      return dashcardConfig.columnOrder;
    }
    if (dashcardConfig?.visibleColumns?.length) {
      return dashcardConfig.visibleColumns;
    }
    return [];
  }, [dashcardConfig?.columnOrder, dashcardConfig?.visibleColumns]);

  const mergeColumnOrder = useCallback(
    (orderSource: string[]) => {
      const filtered = orderSource.filter((id) => allColumnIds.includes(id));
      const missing = allColumnIds.filter((id) => !filtered.includes(id));
      return [...filtered, ...missing];
    },
    [allColumnIds]
  );

  useEffect(() => {
    if (allColumnIds.length === 0) {
      setColumnOrder([]);
      return;
    }

    setColumnOrder((prev) => {
      const base = prev.length ? prev : preferredColumnOrder;
      const next = mergeColumnOrder(base);
      return arraysEqual(prev, next) ? prev : next;
    });
  }, [allColumnIds, preferredColumnOrder, mergeColumnOrder]);

  useEffect(() => {
    const persistedOrder = dashcardConfig?.columnOrder ?? [];
    if (!columnOrder.length && !persistedOrder.length) return;
    if (!arraysEqual(columnOrder, persistedOrder)) {
      updateColumnOrder(columnOrder);
    }
  }, [columnOrder, dashcardConfig?.columnOrder, updateColumnOrder]);

  const effectiveColumnOrder = useMemo(
    () => (columnOrder.length ? columnOrder : allColumnIds),
    [columnOrder, allColumnIds]
  );

  const applyColumnOrderChange = useCallback(
    (order: string[], fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return order;
      }

      const nextOrder = [...order];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);

      const visibleColumns = nextOrder.filter(
        (col) => columnVisibility[col] !== false
      );

      updateVisibleColumns(visibleColumns);
      updateColumnOrder(nextOrder);

      return nextOrder;
    },
    [columnVisibility, updateVisibleColumns, updateColumnOrder]
  );

  const reorderColumns = useCallback(
    (draggedId: string, targetId: string) => {
      setColumnOrder((prev) => {
        const baseOrder = prev.length ? prev : allColumnIds;
        const fromIndex = baseOrder.indexOf(draggedId);
        const toIndex = baseOrder.indexOf(targetId);
        if (fromIndex === -1 || toIndex === -1) {
          return baseOrder;
        }

        return applyColumnOrderChange(baseOrder, fromIndex, toIndex);
      });
    },
    [allColumnIds, applyColumnOrderChange]
  );

  const handleHeaderDragStart = (
    event: DragEvent<HTMLSpanElement>,
    columnId: string
  ) => {
    event.dataTransfer.setData("text/plain", columnId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleHeaderDrop = (
    event: DragEvent<HTMLSpanElement>,
    columnId: string
  ) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === columnId) return;
    reorderColumns(draggedId, columnId);
  };

  const allMenuColumns = useMemo(
    () => Array.from(new Set([...baseColumnIds, ...dynamicColumns])),
    [baseColumnIds, dynamicColumns]
  );

  const menuColumnsOrdered = useMemo(() => {
    const ordered = effectiveColumnOrder.filter((id) =>
      allMenuColumns.includes(id)
    );
    const missing = allMenuColumns.filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  }, [allMenuColumns, effectiveColumnOrder]);

  const filteredColumns = useMemo(() => {
    const base = !columnSearchValue
      ? menuColumnsOrdered
      : menuColumnsOrdered.filter((columnId) =>
          columnId.toLowerCase().includes(columnSearchValue.toLowerCase())
        );

    // Keep selected (visible) columns grouped at the top, preserving relative order
    const visible: string[] = [];
    const hidden: string[] = [];
    base.forEach((col) => {
      if (columnVisibility[col] !== false) {
        visible.push(col);
      } else {
        hidden.push(col);
      }
    });
    return [...visible, ...hidden];
  }, [menuColumnsOrdered, columnSearchValue, columnVisibility]);

  const handleMenuDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination) return;

      if (source.index === destination.index) {
        return;
      }

      setColumnOrder((prev) => {
        const baseOrder = prev.length ? prev : allColumnIds;
        const movingId = filteredColumns[source.index];
        if (!movingId) return baseOrder;

        const visibleOrder = baseOrder.filter((id) =>
          filteredColumns.includes(id)
        );

        const currentIndex = visibleOrder.indexOf(movingId);
        if (currentIndex === -1) return baseOrder;

        const nextVisibleOrder = [...visibleOrder];
        nextVisibleOrder.splice(currentIndex, 1);
        const insertIndex = Math.min(
          Math.max(destination.index, 0),
          nextVisibleOrder.length
        );
        nextVisibleOrder.splice(insertIndex, 0, movingId);

        const remaining = baseOrder.filter(
          (id) => !nextVisibleOrder.includes(id)
        );
        const nextOrder = [...nextVisibleOrder, ...remaining];

        const visibleColumns = nextOrder.filter(
          (col) => columnVisibility[col] !== false
        );

        updateVisibleColumns(visibleColumns);
        updateColumnOrder(nextOrder);

        return nextOrder;
      });
    },
    [filteredColumns, allColumnIds, columnVisibility, updateVisibleColumns, updateColumnOrder]
  );

  const humanizeColumnId = (columnId: string) =>
    columnId
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (c) => c.toUpperCase());

  const renderColumnsDropdown = () => (
    <div
      className="p-2 bg-white border border-gray-200 rounded-md shadow-lg"
      style={{ minWidth: "240px", maxHeight: "340px", overflowY: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2">
        <Input
          placeholder="Search columns..."
          value={columnSearchValue}
          onChange={(e) => setColumnSearchValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          size="small"
        />
      </div>

      {filteredColumns.length > 0 ? (
        <DragDropContext onDragEnd={handleMenuDragEnd}>
          <Droppable droppableId="columns-menu">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {filteredColumns.map((columnId, index) => (
                  <Draggable
                    key={columnId}
                    draggableId={columnId}
                    index={index}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-grab ${
                          snapshot.isDragging ? "bg-gray-100 shadow-sm" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <GripVertical className="h-3 w-3 text-gray-400" />
                        <Checkbox
                          checked={columnVisibility[columnId] !== false}
                          onChange={(e) => {
                            e.stopPropagation();
                            setColumnVisibility((prev) => ({
                              ...prev,
                              [columnId]: e.target.checked,
                            }));
                          }}
                        />
                        <span className="whitespace-nowrap text-sm">
                          {humanizeColumnId(columnId)}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="p-3 text-sm text-gray-400">No columns found</div>
      )}
    </div>
  );

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
        },
      ],
      onClick: ({ key }) => {
        handleMenuClick(key, columnId);
      },
    };
  };

  const pivotData = useMemo(() => {
    return processedItemDashcard.map((item) => {
      const pivotedItem: any = {
        id: item.id,
        name: item.name,
        listId: item.listId,
        boardId: item.boardId,
        members: item.member,
        description: item.description,
        dueDate: item.dueDate,
        createdAt: (item as any).createdAt || (item as any).created_at || null,
        listName: item.listName,
        productInfo: item.productInfo,
        bahanInfo: item.bahanInfo,
        warnaInfo: item.warnaInfo,
      };

      // Add existing column values
      item.columns.forEach((col) => {
        pivotedItem[col.column] = col.value;
      });

      // Add all custom fields from workspace, setting empty values for missing ones
      if (customFields && customFields.length > 0) {
        customFields.forEach((field) => {
          if (pivotedItem[field.name] === undefined) {
            pivotedItem[field.name] = "";
          }
        });
      }

      return pivotedItem;
    });
  }, [processedItemDashcard, customFields]);

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
      const formatNumberValue = (raw: any) => {
        const num =
          typeof raw === "number" ? raw : parseFloat(String(raw ?? "").trim());
        if (!Number.isFinite(num)) return raw;
        // Limit floating noise, then drop trailing zeros (e.g., 12.550000 -> 12.55, 12.0000 -> 12)
        return Number(num.toFixed(6)).toString();
      };

      const findColumn = processedItemDashcard.find((item) => item.id === id);

      if (!findColumn) {
        // Try to get human-readable value from lookup cache
        const humanValue = LookupCache.any(String(value));
        return humanValue || value;
      }

      const findColumnValue = findColumn.columns.find(
        (col) => col.column === column
      );

      if (!findColumnValue) {
        // Try to get human-readable value from lookup cache
        const humanValue = LookupCache.any(String(value));
        return humanValue || value;
      }

      const type = findColumnValue.type;

      if (type === "text") {
        // Try to get human-readable value from lookup cache for text fields
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

      // For any other type, try lookup cache first
      const humanValue = LookupCache.any(String(value));
      return humanValue || value;
    };

    const formatDate = (value: string | Date | number | null | undefined) => {
      if (!value && value !== 0) return "-";
      const date =
        typeof value === "string" || typeof value === "number"
          ? new Date(value)
          : value;
      if (!date || isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    };

    const renderGroupedCell = (
      columnId: string,
      row: any,
      renderer: () => React.ReactNode
    ) => {
      const groupIndex = grouping.indexOf(columnId);
      if (row.getIsGrouped()) {
        if (groupIndex !== -1 && row.depth === groupIndex) {
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => row.getToggleExpandedHandler()()}
                className="cursor-pointer"
              >
                {row.getIsExpanded() ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {renderer()}
              <span className="text-xs text-gray-400">
                ({row.subRows.length})
              </span>
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
          headerTemplate(
            "List",
            getColumnMenu("listName").items || [],
            getColumnMenu("listName").onClick
          ),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("listName", row, () => (
            <span>{row.original.listName || "-"}</span>
          ));
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
          const members = (info.row.original as DataType).members;
          return renderGroupedCell("members", row, () => (
            <div className="flex flex-wrap gap-1">
              <MembersList
                members={members || []}
                membersLength={members?.length || 0}
                membersLoopLimit={3}
              />
            </div>
          ));
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
          const description = info.getValue() as string;
          return renderGroupedCell("description", row, () => (
            <div
              dangerouslySetInnerHTML={{ __html: description || "" }}
              className="max-w-xs overflow-hidden"
            />
          ));
        },
      }),
      columnHelper.accessor("productInfo", {
        header: () =>
          headerTemplate(
            "Produk",
            getColumnMenu("productInfo").items || [],
            getColumnMenu("productInfo").onClick
          ),
        cell: (info) => {
          const row = info.row;
          const productInfo = info.getValue() as any;
          return renderGroupedCell("productInfo", row, () => (
            <div className="max-w-xs truncate">
              {productInfo?.name || "-"}
            </div>
          ));
        },
      }),
      columnHelper.accessor("bahanInfo", {
        header: () =>
          headerTemplate(
            "Bahan",
            getColumnMenu("bahanInfo").items || [],
            getColumnMenu("bahanInfo").onClick
          ),
        cell: (info) => {
          const row = info.row;
          const bahanInfo = info.getValue() as any;
          return renderGroupedCell("bahanInfo", row, () => (
            <div className="max-w-xs truncate">
              {bahanInfo?.name || "-"}
            </div>
          ));
        },
      }),
      columnHelper.accessor("warnaInfo", {
        header: () =>
          headerTemplate(
            "Warna",
            getColumnMenu("warnaInfo").items || [],
            getColumnMenu("warnaInfo").onClick
          ),
        cell: (info) => {
          const row = info.row;
          const warnaInfo = info.getValue() as any;
          return renderGroupedCell("warnaInfo", row, () => (
            <div className="max-w-xs truncate">
              {warnaInfo?.name || "-"}
            </div>
          ));
        },
      }),
      columnHelper.accessor("dueDate", {
        header: () =>
          headerTemplate(
            "Due Date",
            getColumnMenu("dueDate").items || [],
            getColumnMenu("dueDate").onClick
          ),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("dueDate", row, () =>
            formatDate(info.getValue() as any)
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: () =>
          headerTemplate(
            "Created Date",
            getColumnMenu("createdAt").items || [],
            getColumnMenu("createdAt").onClick
          ),
        cell: (info) => {
          const row = info.row;
          return renderGroupedCell("createdAt", row, () =>
            formatDate(info.getValue() as any)
          );
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
            return renderGroupedCell(columnName, row, () =>
              handleRenderDynamicColumn(
                row.original.id,
                columnName,
                info.getValue()
              )
            );
          },
          aggregatedCell: (info) => {
            const row = info.row;
            return renderGroupedCell(columnName, row, () =>
              handleRenderDynamicColumn(
                row.original.id,
                columnName,
                info.getValue()
              )
            );
          },
        })
      ) || [];

    const columnDefinitions = [...baseColumns, ...dynamicColumnsDefinitions];

    const orderedColumns =
      columnOrder.length > 0
        ? columnOrder
            .map((colId) =>
              columnDefinitions.find((col) => col.id === colId)
            )
            .filter((col): col is typeof columnDefinitions[number] => Boolean(col))
        : [];

    const remainingColumns = columnDefinitions.filter(
      (col) => !orderedColumns.some((ordered) => ordered.id === col.id)
    );

    return [...orderedColumns, ...remainingColumns];
  }, [processedItemDashcard, grouping, sorting, dynamicColumns, columnOrder]);

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
      columnOrder,
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

  const rowCount = table.getRowCount();

  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // Excel export function
  const exportToExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const allColumnsForExport = Array.from(
      new Set([...baseColumnIds, ...dynamicColumns])
    );
    const visibleColumns = allColumnsForExport.filter(
      (col) => columnVisibility[col] !== false
    );

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
                        LookupCache.label("user", member.id) ||
                        member.name ||
                        member.id
                    )
                    .join(", ")
                : "";
            break;
          case "description":
            rowData[humanizeColumnId(col)] = value
              ? stripHtml(value as string)
              : "";
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
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      rowData["URL"] = `${baseUrl}/workspace/${currentWorkspaceId}/board/${cardData.boardId}?listId=${cardData.listId}&cardId=${cardData.id}`;

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Table Data");

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `table-export-${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);
  }, [
    baseColumnIds,
    dynamicColumns,
    columnVisibility,
    table,
    humanizeColumnId,
    currentWorkspaceId,
  ]);

  useEffect(() => {
    if (!dashcardConfig) return;

    const allColumnIds = [...baseColumnIds, ...dynamicColumns];
    if (allColumnIds.length === 0) return;

    const visibleColumns = allColumnIds.filter(
      (col) => columnVisibility[col] !== false
    );

    const saved = dashcardConfig.visibleColumns || [];
    const isSame =
      saved.length === visibleColumns.length &&
      saved.every((col) => visibleColumns.includes(col));

    if (!isSame) {
      updateVisibleColumns(visibleColumns);
    }
  }, [columnVisibility, dashcardConfig, dynamicColumns, updateVisibleColumns, baseColumnIds]);

  useEffect(() => {
    const next = grouping.length > 0 ? rowCount : 10;
    setPageSize((prev) => (prev === next ? prev : next));
  }, [grouping.length, rowCount]);

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
          <Button
            icon={<Download className="h-4 w-4" />}
            onClick={() => exportToExcel()}
            type="default"
          >
            Export to Excel
          </Button>
        </div>
        <div>
          <Dropdown
            menu={{ items: [] }}
            dropdownRender={renderColumnsDropdown}
            trigger={["click"]}
            placement="bottomRight"
            open={columnsDropdownOpen}
            onOpenChange={setColumnsDropdownOpen}
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
                  draggable={!header.isPlaceholder}
                  onDragStart={(event) =>
                    !header.isPlaceholder &&
                    handleHeaderDragStart(event, header.column.id)
                  }
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) =>
                    !header.isPlaceholder &&
                    handleHeaderDrop(event, header.column.id)
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
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

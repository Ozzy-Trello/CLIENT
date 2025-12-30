import { DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DropResult } from "@hello-pangea/dnd";

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((val, idx) => val === b[idx]);

const humanizeColumnId = (columnId: string) =>
  columnId
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

type UsePivotColumnsProps = {
  baseColumnIds: string[];
  dynamicColumns: string[];
  dashcardConfig?: { visibleColumns?: string[]; columnOrder?: string[] };
  updateVisibleColumns: (columns: string[]) => void;
  updateColumnOrder: (order: string[]) => void;
};

export const usePivotColumns = ({
  baseColumnIds,
  dynamicColumns,
  dashcardConfig,
  updateVisibleColumns,
  updateColumnOrder,
}: UsePivotColumnsProps) => {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnSearchValue, setColumnSearchValue] = useState("");
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false);

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
    if (!allColumnIds.length) {
      setColumnVisibility({});
      return;
    }

    setColumnVisibility((prev) => {
      const savedVisibleColumns = dashcardConfig?.visibleColumns;
      const newVisibility = { ...prev };
      let changed = false;

      allColumnIds.forEach((col) => {
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
  }, [allColumnIds, baseColumnIds, dashcardConfig?.visibleColumns]);

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

  const allMenuColumns = useMemo(
    () => Array.from(new Set([...baseColumnIds, ...dynamicColumns])),
    [baseColumnIds, dynamicColumns]
  );

  const menuColumnsOrdered = useMemo(() => {
    const ordered = effectiveColumnOrder.filter((id) => allMenuColumns.includes(id));
    const missing = allMenuColumns.filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  }, [allMenuColumns, effectiveColumnOrder]);

  const filteredColumns = useMemo(() => {
    const base = !columnSearchValue
      ? menuColumnsOrdered
      : menuColumnsOrdered.filter((columnId) =>
          columnId.toLowerCase().includes(columnSearchValue.toLowerCase())
        );

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

  const applyColumnOrderChange = useCallback(
    (order: string[], fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return order;
      }

      const nextOrder = [...order];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);

      const visibleColumns = nextOrder.filter((col) => columnVisibility[col] !== false);

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

  const handleHeaderDragStart = useCallback(
    (event: DragEvent<HTMLSpanElement>, columnId: string) => {
      event.dataTransfer.setData("text/plain", columnId);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleHeaderDrop = useCallback(
    (event: DragEvent<HTMLSpanElement>, columnId: string) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === columnId) return;
      reorderColumns(draggedId, columnId);
    },
    [reorderColumns]
  );

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

        const visibleOrder = baseOrder.filter((id) => filteredColumns.includes(id));

        const currentIndex = visibleOrder.indexOf(movingId);
        if (currentIndex === -1) return baseOrder;

        const nextVisibleOrder = [...visibleOrder];
        nextVisibleOrder.splice(currentIndex, 1);
        const insertIndex = Math.min(
          Math.max(destination.index, 0),
          nextVisibleOrder.length
        );
        nextVisibleOrder.splice(insertIndex, 0, movingId);

        const remaining = baseOrder.filter((id) => !nextVisibleOrder.includes(id));
        const nextOrder = [...nextVisibleOrder, ...remaining];

        const visibleColumns = nextOrder.filter((col) => columnVisibility[col] !== false);

        updateVisibleColumns(visibleColumns);
        updateColumnOrder(nextOrder);

        return nextOrder;
      });
    },
    [filteredColumns, allColumnIds, columnVisibility, updateVisibleColumns, updateColumnOrder]
  );

  useEffect(() => {
    const visibleColumns = allColumnIds.filter((col) => columnVisibility[col] !== false);
    const saved = dashcardConfig?.visibleColumns || [];
    const isSame =
      saved.length === visibleColumns.length &&
      saved.every((col) => visibleColumns.includes(col));

    if (!isSame) {
      updateVisibleColumns(visibleColumns);
    }
  }, [columnVisibility, dashcardConfig?.visibleColumns, allColumnIds, updateVisibleColumns]);

  return {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
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
    humanizeColumnId,
  };
};


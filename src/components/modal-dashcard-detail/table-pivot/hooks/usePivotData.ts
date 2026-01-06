import { useMemo } from "react";

export const usePivotData = (processedItemDashcard: any[], customFields: any[]) =>
  useMemo(() => {
    return processedItemDashcard.map((item) => {
      const pivotedItem: Record<string, any> = {
        id: item.id,
        name: item.name,
        listId: item.listId,
        boardId: item.boardId,
        board: (item as any).boardName || item.boardId || "",
        members: item.member,
        description: item.description,
        dueDate: item.dueDate,
        createdAt: (item as any).createdAt || (item as any).created_at || null,
        listName: item.listName,
        productInfo: item.productInfo,
        bahanInfo: item.bahanInfo,
        warnaInfo: item.warnaInfo,
      };

      item.columns.forEach((col: any) => {
        pivotedItem[col.column] = col.value;
      });

      if (customFields && customFields.length > 0) {
        customFields.forEach((field: any) => {
          if (pivotedItem[field.name] === undefined) {
            pivotedItem[field.name] = "";
          }
        });
      }

      return pivotedItem;
    });
  }, [processedItemDashcard, customFields]);

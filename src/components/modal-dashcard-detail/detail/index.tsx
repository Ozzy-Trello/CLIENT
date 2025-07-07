import { FC, useEffect, useState } from "react";
import { useCardDetailContext } from "@providers/card-detail-context";
import ShowFilter from "./filter/show";
import EditFilter from "./filter/edit";
import { IItemDashcard } from "@myTypes/card";
import { LookupCache } from "@utils/lookup-cache";
import { fetchLookups } from "@utils/fetch-lookups";
import { boardDetails } from "@api/board";
import { listDetails } from "@api/list";
import { userDetails } from "@api/account";
import { customFieldDetails } from "@api/custom_field";

const Detail: FC = () => {
  const {
    dashcardConfig,
    selectedCard,
    itemDashcard,
    openEditFilter,
    setProcessedItemDashcard,
    processedItemDashcard,
  } = useCardDetailContext();

  const [lookupVersion, setLookupVersion] = useState(0);

  // Process items and cache lookups
  useEffect(() => {
    if (!itemDashcard.length) {
      setProcessedItemDashcard([]);
      return;
    }

    const processItems = async () => {
      // Collect all IDs that need to be cached
      const boardIds = new Set<string>();
      const listIds = new Set<string>();
      const userIds = new Set<string>();
      const fieldIds = new Set<string>();

      itemDashcard.forEach((item) => {
        if (item.boardId) boardIds.add(item.boardId);
        if (item.listId) listIds.add(item.listId);

        // Collect member IDs
        item.member?.forEach((member) => {
          if (member.id) userIds.add(member.id);
        });

        // Collect custom field IDs from columns
        item.columns?.forEach((col) => {
          if (col.column && col.column.startsWith("custom_field_")) {
            const fieldId = col.column.replace("custom_field_", "");
            fieldIds.add(fieldId);
          }
        });
      });

      // Fetch missing lookups
      const promises = [];

      if (boardIds.size > 0) {
        const unknownBoards = Array.from(boardIds).filter(
          (id) => !LookupCache.label("board", id)
        );
        if (unknownBoards.length > 0) {
          promises.push(
            fetchLookups("board", unknownBoards, boardDetails as any)
          );
        }
      }

      if (listIds.size > 0) {
        const unknownLists = Array.from(listIds).filter(
          (id) => !LookupCache.label("list", id)
        );
        if (unknownLists.length > 0) {
          promises.push(fetchLookups("list", unknownLists, listDetails as any));
        }
      }

      if (userIds.size > 0) {
        const unknownUsers = Array.from(userIds).filter(
          (id) => !LookupCache.label("user", id)
        );
        if (unknownUsers.length > 0) {
          promises.push(fetchLookups("user", unknownUsers, userDetails as any));
        }
      }

      if (fieldIds.size > 0) {
        const unknownFields = Array.from(fieldIds).filter(
          (id) => !LookupCache.label("field", id)
        );
        if (unknownFields.length > 0) {
          promises.push(
            fetchLookups("field", unknownFields, customFieldDetails as any)
          );
        }
      }

      // Wait for all lookups to complete
      await Promise.all(promises);

      // Process items with cached data
      const processed = itemDashcard.map((item) => {
        const processedItem = { ...item } as any;

        // Add board and list names
        if (item.boardId) {
          processedItem.boardName =
            LookupCache.label("board", item.boardId) || item.boardId;
        }
        if (item.listId) {
          processedItem.listName =
            LookupCache.label("list", item.listId) || item.listId;
        }

        // Process members with names
        if (item.member) {
          processedItem.member = item.member.map((member) => ({
            ...member,
            name:
              LookupCache.label("user", member.id) || member.name || member.id,
          }));
        }

        // Process custom field columns
        if (item.columns) {
          processedItem.columns = item.columns.map((col) => {
            const processedCol = { ...col };

            // If it's a custom field, try to get the field name and option labels
            if (col.column.startsWith("custom_field_")) {
              const fieldId = col.column.replace("custom_field_", "");
              const fieldName = LookupCache.label("field", fieldId);

              if (fieldName) {
                processedCol.column = fieldName;
              }

              // Try to get option label for the value
              if (col.value && col.type === "select") {
                const optionLabel = LookupCache.label("field", col.value);
                if (optionLabel) {
                  processedCol.value = optionLabel;
                }
              }
            }

            return processedCol;
          });
        }

        return processedItem;
      });

      setProcessedItemDashcard(processed);
      setLookupVersion((v) => v + 1);
    };

    processItems();
  }, [itemDashcard]);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-3">
        <div
          style={{
            backgroundColor: dashcardConfig?.backgroundColor || "#1890ff",
          }}
          className="w-60 h-40 rounded-lg flex items-center justify-center text-white font-bold text-xl relative"
        >
          {processedItemDashcard?.length || 0}
          <div className="absolute top-3 left-3 text-sm">Card</div>
          <div className="absolute bottom-3 left-3 text-sm">
            {selectedCard?.name}
          </div>
        </div>
      </div>

      {openEditFilter ? <EditFilter /> : <ShowFilter />}
    </div>
  );
};

export default Detail;

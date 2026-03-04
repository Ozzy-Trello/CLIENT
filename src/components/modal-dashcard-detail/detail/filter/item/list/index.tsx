import { FC, useMemo, useEffect, useState } from "react";
import { DashcardFilter, dashcardsFilter, EnumCardAttributeType, FilterOperator } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { LookupCache } from "@utils/lookup-cache";
import { fetchLookups } from "@utils/fetch-lookups";
import { listDetails, lists as fetchListsApi } from "@api/list";
import { useParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { useBoards } from "@hooks/board";

const ListItemFilter: FC<DashcardFilter & { id: string; label?: string }> = ({ id, label, operator, value }) => {
  const {
    openEditFilter,
    handleChangeFilter,
    handleDeleteFilter,
    currentFilter,
  } = useCardDetailContext();

  const params = useParams();
  const currentBoardId = params.boardId
    ? decodeURIComponent(params.boardId as string)
    : undefined;
  const resolvedWorkspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string | undefined);

  const { boards: boardsArr } = useBoards(resolvedWorkspaceId);

  const isNoValueInput = String(operator) === "on_this_list";
  const isMultiSelect = operator === FilterOperator.IS_ONE_OF || operator === FilterOperator.IS_NOT_ONE_OF;
  const [lookupVersion, setLookupVersion] = useState(0);

  // Fetch lookup data for the list value if not cached
  useEffect(() => {
    const fetchListLookup = async () => {
      if (!value) return;

      const listIds = Array.isArray(value) ? value : [value];
      const unknownListIds = listIds
        .filter((id): id is string => typeof id === 'string')
        .filter(id => !LookupCache.label("list", id));

      if (unknownListIds.length > 0) {
        await fetchLookups("list", unknownListIds, listDetails as any);
        setLookupVersion(v => v + 1);
      }
    };

    fetchListLookup();
  }, [value]);

  // Extract selected board IDs from board filters in currentFilter
  const selectedBoardIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentBoardId) ids.add(currentBoardId);
    currentFilter
      .filter((f) => f.type === EnumCardAttributeType.BOARD)
      .forEach((f) => {
        const op = String(f.operator || "");
        if (op === "is_one_of" || op === "is_not_one_of" || op === FilterOperator.IS_ONE_OF || op === FilterOperator.IS_NOT_ONE_OF) {
          const vals = Array.isArray(f.value)
            ? f.value
            : typeof f.value === "string"
            ? f.value.split(",").map((v) => v.trim()).filter(Boolean)
            : f.value
            ? [String(f.value)]
            : [];
          vals.forEach((v) => ids.add(v as string));
        }
      });
    return Array.from(ids);
  }, [currentFilter, currentBoardId]);

  // Fetch lists from all selected boards
  const boardListQueries = useQueries({
    queries: selectedBoardIds.map((bId) => ({
      queryKey: ["lists", bId],
      queryFn: () => fetchListsApi(bId),
      enabled: !!bId,
      staleTime: 5000,
    })),
  });

  // Build boardId -> boardName map
  const boardNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (boardsArr || []).forEach((b: any) => {
      map[b.id] = b.name || b.id;
    });
    return map;
  }, [boardsArr]);

  // Merge lists from all boards into options
  const listSelectOptions = useMemo(() => {
    const showBoardLabel = selectedBoardIds.length > 1;
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];

    boardListQueries.forEach((query, idx) => {
      const bId = selectedBoardIds[idx];
      const boardLists = query.data?.data || [];
      boardLists.forEach((l: any) => {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          opts.push({
            label: showBoardLabel
              ? `${l.name || ""} (${boardNameMap[bId] || bId})`
              : l.name || "",
            value: l.id,
          });
        }
      });
    });

    return opts;
  }, [boardListQueries, selectedBoardIds, boardNameMap]);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter, id]);

  const options = useMemo(() => {
    return (
      dashcardsFilter.find((filter) => filter.id === "list")?.options ?? []
    );
  }, []);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{label || "List"}</div>
          <div className="p-2 rounded-lg w-full">
            <Select
              options={options}
              value={valueEdit?.operator}
              onChange={(value) =>
                handleChangeFilter({ id, operator: value })
              }
              className="w-full"
            />
          </div>
          {!isNoValueInput && (
            <div className="p-2 rounded-lg">
              <Select
                mode={isMultiSelect ? "multiple" : undefined}
                size="small"
                className="min-w-[200px]"
                showSearch
                optionFilterProp="label"
                options={listSelectOptions}
                value={isMultiSelect ? (Array.isArray(valueEdit?.value) ? valueEdit.value : []) : (valueEdit?.value as string)}
                onChange={(selectedValue: string | string[]) =>
                  handleChangeFilter({ id, value: selectedValue })
                }
                placeholder="Select list"
                notFoundContent={listSelectOptions.length === 0 ? "No list available" : "No match found"}
              />
            </div>
          )}
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("list", id)}
        />
      </div>
    );

  const displayValue = useMemo((): string => {
    if (!value) return '';

    if (typeof value === "string") {
      return LookupCache.label("list", value) || LookupCache.any(value) || value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => 
        typeof v === 'string' 
          ? LookupCache.label("list", v) || LookupCache.any(v) || v 
          : String(v)
      ).join(", ");
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }, [value, lookupVersion]);

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{label || "List"}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">
        {displayValue}
      </div>
    </div>
  );
};

export default ListItemFilter;

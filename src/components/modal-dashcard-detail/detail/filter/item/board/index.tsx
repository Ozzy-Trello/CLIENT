import { FC, useMemo, useEffect, useState } from "react";
import { DashcardFilter, dashcardsFilter, FilterOperator } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { LookupCache } from "@utils/lookup-cache";
import { fetchLookups } from "@utils/fetch-lookups";
import { boardDetails } from "@api/board";
import { BoardSelection } from "@components/selection";

const BoardItemFilter: FC<DashcardFilter> = ({ id, operator, value, label }) => {
  const {
    openEditFilter,
    currentFilter,
    handleChangeFilter,
    handleDeleteFilter,
  } = useCardDetailContext();

  const normalizedOperator = String(operator || "").replace(/\s+/g, "_");
  const isNoValueInput = normalizedOperator === "on_this_board";
  const isMultiSelect =
    normalizedOperator === FilterOperator.IS_ONE_OF ||
    normalizedOperator === FilterOperator.IS_NOT_ONE_OF;
  const [lookupVersion, setLookupVersion] = useState(0);

  // Fetch lookup data for the board value if not cached
  useEffect(() => {
    const fetchBoardLookup = async () => {
      if (!value) return;
      
      const boardIds = Array.isArray(value) ? value : [value];
      const unknownBoardIds = boardIds
        .filter((id): id is string => typeof id === 'string')
        .filter(id => !LookupCache.label("board", id));
      
      if (unknownBoardIds.length > 0) {
        await fetchLookups("board", unknownBoardIds, boardDetails as any);
        setLookupVersion(v => v + 1);
      }
    };

    fetchBoardLookup();
  }, [value]);

  const options = useMemo(() => {
    return (
      dashcardsFilter.find((filter) => filter.id === "board")?.options ?? []
    );
  }, []);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter, id]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{label || "Board"} cokkk</div>
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
              <BoardSelection
                value={
                  isMultiSelect
                    ? (Array.isArray(valueEdit?.value)
                        ? valueEdit?.value
                        : typeof valueEdit?.value === "string"
                        ? valueEdit?.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean)
                        : valueEdit?.value
                        ? [String(valueEdit?.value)]
                        : [])
                    : (valueEdit?.value as string)
                }
                onChange={(selectedValue: string | string[]) => {
                  const nextValue = isMultiSelect
                    ? selectedValue
                    : Array.isArray(selectedValue)
                    ? selectedValue[0]
                    : selectedValue;

                  handleChangeFilter({ id, value: nextValue });
                }}
                placeholder="Select board"
                size="small"
                mode={isMultiSelect ? "multiple" : undefined}
              />
            </div>
          )}
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("board", id)}
        />
      </div>
    );

  const displayValue = useMemo(() => {
    if (!value) return value;
    
    if (typeof value === 'string') {
      return LookupCache.label("board", value) || LookupCache.any(value) || value;
    }
    
    if (Array.isArray(value)) {
      return value.map(v => 
        typeof v === 'string' 
          ? LookupCache.label("board", v) || LookupCache.any(v) || v 
          : v
      ).join(', ');
    }
    
    return value;
  }, [value, lookupVersion]);

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{label || "Board"}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      {!isNoValueInput && (
        <div className="border p-2 rounded-lg border-gray-200">{String(displayValue)}</div>
      )}
    </div>
  );
};

export default BoardItemFilter;

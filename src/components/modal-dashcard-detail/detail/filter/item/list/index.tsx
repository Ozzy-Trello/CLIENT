import { FC, useMemo, useEffect, useState } from "react";
import { DashcardFilter, dashcardsFilter, FilterOperator } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { LookupCache } from "@utils/lookup-cache";
import { fetchLookups } from "@utils/fetch-lookups";
import { listDetails } from "@api/list";
import { ListSelection } from "@components/selection";

const ListItemFilter: FC<DashcardFilter & { id: string; label?: string }> = ({ id, label, operator, value }) => {
  const {
    openEditFilter,
    handleChangeFilter,
    handleDeleteFilter,
    currentFilter,
  } = useCardDetailContext();

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
              <ListSelection
                value={isMultiSelect ? (Array.isArray(valueEdit?.value) ? valueEdit.value : []) : (valueEdit?.value as string)}
                onChange={(selectedValue: string | string[]) =>
                  handleChangeFilter({ id, value: selectedValue })
                }
                placeholder="Select list"
                size="small"
                mode={isMultiSelect ? "multiple" : undefined}
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

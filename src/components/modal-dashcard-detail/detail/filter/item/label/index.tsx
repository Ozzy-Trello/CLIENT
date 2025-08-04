import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter, FilterOperator } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { LookupCache } from "@utils/lookup-cache";
import { LabelSelection } from "@components/selection";

const LabelsItemFilter: FC<DashcardFilter> = ({ id, operator, value, label }) => {
  const {
    openEditFilter,
    currentFilter,
    handleChangeFilter,
    handleDeleteFilter,
  } = useCardDetailContext();

  const options = useMemo(() => {
    return (
      dashcardsFilter.find((filter) => filter.id === "labels")?.options ?? []
    );
  }, []);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter, id]);

  // Check if the current operator requires no input
  const isNoValueInput = useMemo(() => {
    const op = valueEdit?.operator;
    return op === FilterOperator.ANY || op === FilterOperator.ANY_VALUE || op === FilterOperator.NO_VALUE;
  }, [valueEdit?.operator]);

  // Check if the current operator requires multi-select
  const isMultiSelect = useMemo(() => {
    const op = valueEdit?.operator;
    return op === FilterOperator.IS_ONE_OF || op === FilterOperator.IS_NOT_ONE_OF;
  }, [valueEdit?.operator]);

  // Check if the current operator requires text input
  const isTextInput = useMemo(() => {
    const op = valueEdit?.operator;
    return op === FilterOperator.STARTS_WITH || op === FilterOperator.MATCHES_WITH;
  }, [valueEdit?.operator]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{label || "Labels"}</div>
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
              {isTextInput ? (
                <Input
                  size="small"
                  placeholder="Enter text"
                  value={(valueEdit?.value as string) ?? ""}
                  onChange={(e) =>
                    handleChangeFilter({ id, value: e.target.value })
                  }
                />
              ) : (
                <LabelSelection
                  value={(valueEdit?.value as string) ?? ""}
                  onChange={(selectedValue: string) =>
                    handleChangeFilter({ id, value: selectedValue })
                  }
                  placeholder="Select label"
                  size="small"
                  mode={isMultiSelect ? "multiple" : undefined}
                />
              )}
            </div>
          )}
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("labels", id)}
        />
      </div>
    );

  const displayValue = useMemo(() => {
    if (!value) return "";
    
    if (typeof value === 'string') {
      return LookupCache.label("label", value) || value;
    }
    
    if (Array.isArray(value)) {
      return value.map(v => 
        typeof v === 'string' 
          ? LookupCache.label("label", v) || v 
          : v
      ).join(', ');
    }
    
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{label || "Labels"}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">{displayValue}</div>
    </div>
  );
};

export default LabelsItemFilter;

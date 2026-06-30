import { FC, useMemo, useState, useEffect } from "react";
import { DashcardFilter, dashcardsFilter } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText, convertValueToText } from "@components/modal-dashcard-detail/util";
import { Button, Input, Select, InputNumber, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const DueItemFilter: FC<DashcardFilter> = ({ id, operator, value, label }) => {
  const {
    openEditFilter,
    currentFilter,
    handleChangeFilter,
    handleDeleteFilter,
  } = useCardDetailContext();

  const options = useMemo(() => {
    return dashcardsFilter.find((filter) => filter.id === "due")?.options ?? [];
  }, []);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter, id]);

  // States for complex due date filters
  const [number, setNumber] = useState<number>(1);
  const [unit, setUnit] = useState<string>("days");
  const [reference, setReference] = useState<string>("from now");

  // Initialize complex filter values when editing
  useEffect(() => {
    if (valueEdit?.value && typeof valueEdit.value === "object") {
      const filterValue = valueEdit.value as any;
      if (filterValue.number) setNumber(filterValue.number);
      if (filterValue.unit) setUnit(filterValue.unit);
      if (filterValue.reference) setReference(filterValue.reference);
    }
  }, [valueEdit?.value]);

  // Check if current operator requires complex inputs
  const isComplexOption = useMemo(() => {
    const operator = valueEdit?.operator as string;
    return operator === "later_than" || operator === "earlier_than";
  }, [valueEdit?.operator]);

  // Handle complex filter value changes
  const handleComplexValueChange = (newNumber?: number, newUnit?: string, newReference?: string) => {
    const complexValue = {
      type: "relative",
      number: newNumber ?? number,
      unit: newUnit ?? unit,
      reference: newReference ?? reference,
    };
    handleChangeFilter({ id, value: complexValue });
  };

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{label || "Due Date"}</div>
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
          {isComplexOption && (
            <div className="p-2 rounded-lg">
              <Space.Compact>
                <InputNumber
                  min={1}
                  value={number}
                  onChange={(value) => {
                    const newNumber = value || 1;
                    setNumber(newNumber);
                    handleComplexValueChange(newNumber, unit, reference);
                  }}
                  style={{ width: "80px" }}
                />
                <Select
                  value={unit}
                  onChange={(newUnit) => {
                    setUnit(newUnit);
                    handleComplexValueChange(number, newUnit, reference);
                  }}
                  style={{ width: "100px" }}
                  options={[
                    { label: "days", value: "days" },
                    { label: "weeks", value: "weeks" },
                    { label: "months", value: "months" },
                    { label: "years", value: "years" },
                  ]}
                />
                <Select
                  value={reference}
                  onChange={(newReference) => {
                    setReference(newReference);
                    handleComplexValueChange(number, unit, newReference);
                  }}
                  style={{ width: "120px" }}
                  options={[
                    { label: "from now", value: "from now" },
                    { label: "ago", value: "ago" },
                  ]}
                />
              </Space.Compact>
            </div>
          )}
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("due_date", id)}
        />
      </div>
    );

  const showValue = (operator as string) === "later_than" || (operator as string) === "earlier_than";

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{label || "Due Date"}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      {showValue && (
        <div className="border p-2 rounded-lg border-gray-200">{convertValueToText(value)}</div>
      )}
    </div>
  );
};

export default DueItemFilter;

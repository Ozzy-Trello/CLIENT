import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Checkbox, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const CompleteItemFilter: FC<DashcardFilter> = ({ id, operator, value, label }) => {
  const {
    openEditFilter,
    currentFilter,
    handleChangeFilter,
    handleDeleteFilter,
  } = useCardDetailContext();

  const options = useMemo(() => {
    return (
      dashcardsFilter.find((filter) => filter.id === "complete")?.options ?? []
    );
  }, []);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter, id]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{label || "Complete"}</div>
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
          <div className="p-2 rounded-lg">
            <Checkbox
              value={(valueEdit?.value as boolean) ?? false}
              onChange={(e) =>
                handleChangeFilter({ id, value: e.target.checked })
              }
            />
          </div>
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("is_completed", id)}
        />
      </div>
    );

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{label || "Complete"}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">
        <Checkbox checked={value as boolean} />
      </div>
    </div>
  );
};

export default CompleteItemFilter;

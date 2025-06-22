import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Checkbox, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const CompleteItemFilter: FC<DashcardFilter> = ({ operator, value }) => {
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
    return currentFilter.find((filter) => filter.id === "complete");
  }, [currentFilter]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">Complete</div>
          <div className="p-2 rounded-lg w-full">
            <Select
              options={options}
              value={valueEdit?.operator}
              onChange={(value) =>
                handleChangeFilter({ id: "complete", operator: value })
              }
              className="w-full"
            />
          </div>
          <div className="p-2 rounded-lg">
            <Checkbox
              value={(valueEdit?.value as boolean) ?? false}
              onChange={(e) =>
                handleChangeFilter({ id: "complete", value: e.target.checked })
              }
            />
          </div>
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("is_completed")}
        />
      </div>
    );

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">Complete</div>
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

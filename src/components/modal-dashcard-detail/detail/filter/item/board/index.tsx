import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const BoardItemFilter: FC<DashcardFilter> = ({ operator, value }) => {
  const {
    openEditFilter,
    currentFilter,
    handleChangeFilter,
    handleDeleteFilter,
  } = useCardDetailContext();

  const options = useMemo(() => {
    return (
      dashcardsFilter.find((filter) => filter.id === "board")?.options ?? []
    );
  }, []);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === "board");
  }, [currentFilter]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">Board</div>
          <div className="p-2 rounded-lg w-full">
            <Select
              options={options}
              value={valueEdit?.operator}
              onChange={(value) =>
                handleChangeFilter({ id: "board", operator: value })
              }
              className="w-full"
            />
          </div>
          <div className="p-2 rounded-lg">
            <Input
              value={(valueEdit?.value as string) ?? ""}
              onChange={(e) =>
                handleChangeFilter({ id: "board", value: e.target.value })
              }
            />
          </div>
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("board")}
        />
      </div>
    );

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">Board</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">{value}</div>
    </div>
  );
};

export default BoardItemFilter;

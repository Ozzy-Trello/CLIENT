import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { useAccountList } from "@hooks/account";
import { useParams } from "next/navigation";
import { Account } from "@dto/account";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { UserSelection } from "@components/selection";

const AssignedItemFilter: FC<DashcardFilter> = ({ id, operator, value, label }) => {
  const {
    openEditFilter,
    currentFilter,
    handleChangeFilter,
    handleDeleteFilter,
  } = useCardDetailContext();
  const params = useParams();

  const { data } = useAccountList({
    workspaceId: params.workspaceId as string,
    boardId: params.boardId as string,
  });

  const user = useMemo(() => {
    if (!data) return undefined;
    return {
      selected: data.data?.find((item) => item.id === value),
      options: data.data?.map((item) => ({
        label: item.username,
        value: item.id,
      })),
    };
  }, [data]);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter, id]);

  const options = useMemo(() => {
    return (
      dashcardsFilter.find((filter) => filter.id === "assigned")?.options ?? []
    );
  }, []);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{label || "Assigned"}</div>
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
            <UserSelection
              value={valueEdit?.value as string}
              onChange={(selectedValue: string) =>
                handleChangeFilter({ id, value: selectedValue })
              }
              placeholder="Select user"
              size="small"
            />
          </div>
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter("assigned", id)}
        />
      </div>
    );

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{label || "Assigned"}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">
        {user?.selected?.username}
      </div>
    </div>
  );
};

export default AssignedItemFilter;

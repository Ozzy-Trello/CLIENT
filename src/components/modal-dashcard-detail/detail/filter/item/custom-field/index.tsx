import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import { Button, Input, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const CustomFieldItemFilter: FC<DashcardFilter> = ({
  operator,
  value,
  id,
  type,
}) => {
  const params = useParams();

  const {
    openEditFilter,
    handleChangeFilter,
    handleDeleteFilter,
    currentFilter,
  } = useCardDetailContext();

  const { customFields } = useCustomFields(params.workspaceId as string);

  const valueEdit = useMemo(() => {
    return currentFilter.find((filter) => filter.id === id);
  }, [currentFilter]);

  const item = useMemo(() => {
    return customFields?.find((field) => field.id === id);
  }, [customFields, id]);

  if (openEditFilter)
    return (
      <div className="flex items-center gap-3 justify-between">
        <div className="flex gap-3 items-center">
          <div className="font-semibold min-w-16">{item?.name}</div>
          <div className="p-2 rounded-lg w-full">
            <Select
              options={[
                { label: "any", value: "any" },
                { label: "select", value: "select" },
              ]}
              value={valueEdit?.operator}
              onChange={(value) => handleChangeFilter({ id, operator: value })}
              className="w-full"
            />
          </div>
          <div className="p-2 rounded-lg">
            <Input
              value={valueEdit?.value as string}
              onChange={(e) =>
                handleChangeFilter({ id, value: e.target.value })
              }
            />
          </div>
        </div>
        <Button
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteFilter(type, id)}
        />
      </div>
    );

  return (
    <div className="flex items-center gap-3">
      <div className="font-semibold min-w-16">{item?.name}</div>
      <div className="border p-2 rounded-lg border-gray-200">
        {convertOperatorToText(operator ?? "")}
      </div>
      <div className="border p-2 rounded-lg border-gray-200">{value}</div>
    </div>
  );
};

export default CustomFieldItemFilter;

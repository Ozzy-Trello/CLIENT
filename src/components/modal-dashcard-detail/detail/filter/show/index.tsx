import { FC } from "react";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useCardDetailContext } from "@providers/card-detail-context";
import ItemFilter from "../item";

const ShowFilter: FC = () => {
  const { dashcardConfig, setOpenEditFilter, setCurrentFilter } =
    useCardDetailContext();
  return (
    <div className="flex flex-col gap-3 w-full">
      {dashcardConfig?.filters?.map((filter) => (
        <ItemFilter key={filter.id} item={filter} />
      ))}
      <Button
        onClick={() => {
          setCurrentFilter(
            JSON.parse(JSON.stringify(dashcardConfig?.filters ?? []))
          );
          setOpenEditFilter(true);
        }}
        className="w-max"
        icon={<EditOutlined />}
      >
        Edit Filters
      </Button>
    </div>
  );
};

export default ShowFilter;

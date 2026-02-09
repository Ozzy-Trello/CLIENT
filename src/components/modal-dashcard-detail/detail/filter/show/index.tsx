import { FC } from "react";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCurrentAccount } from "@hooks/account";
import ItemFilter from "../item";

const ShowFilter: FC = () => {
  const { dashcardConfig, setOpenEditFilter, setCurrentFilter } =
    useCardDetailContext();
  const { data: account } = useCurrentAccount();
  const canEditFilter =
    account?.data?.role?.id === "f97c942c-5d0c-49c3-b74d-5b149c08634f";

  return (
    <div className="flex flex-col gap-3 w-full">
      {dashcardConfig?.filters?.map((filter) => (
        <ItemFilter key={filter.id} item={filter} />
      ))}
      {canEditFilter && (
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
      )}
    </div>
  );
};

export default ShowFilter;

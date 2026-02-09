import { FC } from "react";
import { useSelector } from "react-redux";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useCardDetailContext } from "@providers/card-detail-context";
import { selectUser } from "@store/app_slice";
import ItemFilter from "../item";

const ShowFilter: FC = () => {
  const { dashcardConfig, setOpenEditFilter, setCurrentFilter } =
    useCardDetailContext();
  const currentUser = useSelector(selectUser);
  const SUPER_ADMIN_ROLE_ID = "f97c942c-5d0c-49c3-b74d-5b149c08634f";
  const isSuperAdmin = currentUser?.role?.id === SUPER_ADMIN_ROLE_ID;
  return (
    <div className="flex flex-col gap-3 w-full">
      {dashcardConfig?.filters?.map((filter) => (
        <ItemFilter key={filter.id} item={filter} />
      ))}
      {isSuperAdmin && (
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

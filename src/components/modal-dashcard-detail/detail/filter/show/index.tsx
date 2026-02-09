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
  const user = useSelector(selectUser);
  const normalizedRole = (user?.role?.name || "").trim().toLowerCase();
  const isSuperAdmin =
    normalizedRole === "super admin" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "superadmin";
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

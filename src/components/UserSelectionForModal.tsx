import { Avatar, Select, Typography } from "antd";
import { type FC, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccountListForModal } from "@hooks/account";

const UserSelectionForModal: FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder = "Select a User", disabled = false }) => {
  const { workspaceId } = useParams();

  const { data: accountListData, isLoading: accountListLoading } =
    useAccountListForModal({
      workspaceId: Array.isArray(workspaceId)
        ? (workspaceId[0] as string)
        : (workspaceId as string),
    });

  const options = useMemo(() => {
    if (!accountListData?.data) return [];

    return accountListData.data.map((item) => ({
      value: item.id,
      label: (
        <div className="flex justify-start items-center gap-3">
          <Avatar
            size={20}
            className="bg-blue-50 text-blue-500 border border-blue-100"
          >
            {item.username?.substring(0, 2)?.toUpperCase()}
          </Avatar>
          <Typography.Text>{item.username}</Typography.Text>
        </div>
      ),
    }));
  }, [accountListData]);

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      loading={accountListLoading}
      options={options}
      style={{ width: "100%" }}
      showSearch
      disabled={disabled}
      filterOption={(input, option) =>
        (option?.label as any)?.props?.children?.[1]?.props?.children
          ?.toLowerCase()
          ?.includes(input.toLowerCase()) ?? false
      }
    />
  );
};

export default UserSelectionForModal;

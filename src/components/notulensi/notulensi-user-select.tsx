"use client";

import { useAccountListForModal } from "@hooks/account";
import { Avatar, Select, Typography } from "antd";
import { useParams } from "next/navigation";
import { useMemo } from "react";

type NotulensiUserSelectProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
};

const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

export default function NotulensiUserSelect({
  value,
  onChange,
  disabled,
}: NotulensiUserSelectProps) {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";

  const { data, isLoading } = useAccountListForModal({ workspaceId });

  const options = useMemo(() => {
    return (data?.data || []).map((account) => ({
      value: account.id,
      searchLabel: `${account.username} ${account.email}`.toLowerCase(),
      label: (
        <div className="flex items-center gap-3">
          <Avatar size={24}>{getInitials(account.username)}</Avatar>
          <div className="min-w-0">
            <Typography.Text className="block">{account.username}</Typography.Text>
            <Typography.Text type="secondary" className="block text-xs">
              {account.email}
            </Typography.Text>
          </div>
        </div>
      ),
    }));
  }, [data]);

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      disabled={disabled}
      loading={isLoading}
      options={options}
      optionFilterProp="searchLabel"
      placeholder="Assign users"
      maxTagCount="responsive"
      className="w-full"
      filterOption={(input, option) =>
        String(option?.searchLabel || "").includes(input.toLowerCase())
      }
    />
  );
}

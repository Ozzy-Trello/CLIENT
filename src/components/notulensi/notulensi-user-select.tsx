"use client";

import { useNotulensiEligibleAssignees } from "@hooks/notulensi";
import { Select, Typography } from "antd";
import { useParams } from "next/navigation";
import { useMemo } from "react";

type NotulensiUserSelectProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
};

export default function NotulensiUserSelect({
  value,
  onChange,
  disabled,
}: NotulensiUserSelectProps) {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";

  const { data, isLoading } = useNotulensiEligibleAssignees(workspaceId);

  const options = useMemo(() => {
    return (data?.data || []).map((account) => ({
      value: account.id,
      searchLabel: `${account.username} ${account.email} ${account.role?.name || ""}`.toLowerCase(),
      label: (
        <div className="min-w-0 py-0.5">
          <Typography.Text className="block truncate">{account.username}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">
            {[account.role?.name, account.email].filter(Boolean).join(" · ")}
          </Typography.Text>
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
      maxTagCount={2}
      maxTagPlaceholder={(omitted) => `+${omitted.length}`}
      className="w-full"
      filterOption={(input, option) =>
        String(option?.searchLabel || "").includes(input.toLowerCase())
      }
    />
  );
}

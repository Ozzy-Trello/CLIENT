"use client";

import {
  NOTULENSI_PRIORITY_META,
  NOTULENSI_STATUS_ORDER,
  NotulensiStatusLabel,
} from "@components/notulensi/notulensi-status";
import { NotulensiListFilters, NotulensiPriority, NotulensiScope, NotulensiStatus } from "@myTypes/notulensi";
import { Button, DatePicker, Grid, Input, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";

type Props = {
  value: NotulensiListFilters;
  onChange: (next: NotulensiListFilters) => void;
  allowAll?: boolean;
  statusCounts?: Record<NotulensiStatus, number>;
};

const scopeOptions: { value: NotulensiScope; label: string }[] = [
  { value: "related", label: "All related" },
  { value: "created", label: "Created by me" },
  { value: "assigned", label: "Assigned to me" },
  { value: "all", label: "All workspace" },
];

export default function NotulensiFilters({ value, onChange, allowAll = false, statusCounts }: Props) {
  const screens = Grid.useBreakpoint();
  const [searchText, setSearchText] = useState(value.search || "");

  const rangeValue = useMemo(() => {
    return value.dueFrom && value.dueTo
      ? [dayjs(value.dueFrom), dayjs(value.dueTo)]
      : null;
  }, [value.dueFrom, value.dueTo]);

  const applyPatch = (patch: Partial<NotulensiListFilters>) => {
    onChange({ ...value, ...patch, page: 1 });
  };

  const clearFilters = () => {
    setSearchText("");
    onChange({ scope: "assigned", page: 1, limit: value.limit });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <Input.Search
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onSearch={(search) => applyPatch({ search: search.trim() || undefined })}
          placeholder="Search instructions"
          allowClear
          className="min-w-0 flex-1"
        />
        <Select<NotulensiStatus[]>
          mode="multiple"
          value={value.status}
          onChange={(status) => applyPatch({ status: status.length ? status : undefined })}
          placeholder="Status"
          maxTagCount="responsive"
          className={screens.lg ? "w-56" : "w-full"}
          options={NOTULENSI_STATUS_ORDER.map((status) => ({
            value: status,
            label: (
              <span className="inline-flex items-center gap-1">
                <NotulensiStatusLabel status={status} />
                <span>({statusCounts?.[status] ?? 0})</span>
              </span>
            ),
          }))}
        />
        <Select<NotulensiPriority[]>
          mode="multiple"
          value={value.priority}
          onChange={(priority) =>
            applyPatch({ priority: priority.length ? priority : undefined })
          }
          placeholder="Priority"
          maxTagCount="responsive"
          className={screens.lg ? "w-56" : "w-full"}
          options={Object.entries(NOTULENSI_PRIORITY_META).map(([priority, meta]) => ({
            value: priority,
            label: meta.label,
          }))}
        />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <Select<NotulensiScope>
          value={value.scope || "assigned"}
          onChange={(scope) => applyPatch({ scope })}
          className={screens.lg ? "w-56" : "w-full"}
          options={scopeOptions.filter((option) => allowAll || option.value !== "all")}
        />
        <DatePicker.RangePicker
          value={rangeValue as [Dayjs, Dayjs] | null}
          onChange={(dates) =>
            applyPatch({
              dueFrom: dates?.[0]?.startOf("day").toISOString(),
              dueTo: dates?.[1]?.endOf("day").toISOString(),
            })
          }
          className={screens.lg ? "w-80" : "w-full"}
          allowClear
        />
        <Button onClick={clearFilters}>Clear filters</Button>
      </div>
    </div>
  );
}

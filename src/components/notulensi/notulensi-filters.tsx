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

const statusFilterStyles: Record<NotulensiStatus, string> = {
  new: "border-blue-600 bg-blue-600 text-white",
  in_progress: "border-amber-500 bg-amber-500 text-white",
  revision: "border-orange-500 bg-orange-500 text-white",
  waiting_review: "border-violet-600 bg-violet-600 text-white",
  completed: "border-emerald-600 bg-emerald-600 text-white",
  cancelled: "border-rose-600 bg-rose-600 text-white",
};

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

  const toggleStatus = (status: NotulensiStatus) => {
    const selected = value.status || [];
    const next = selected.includes(status)
      ? selected.filter((item) => item !== status)
      : [...selected, status];
    applyPatch({ status: next.length ? next : undefined });
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="pb-1"
        role="group"
        aria-label="Filter tasks by status"
      >
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
          {NOTULENSI_STATUS_ORDER.map((status) => {
            const selected = value.status?.includes(status) ?? false;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleStatus(status)}
                className={`flex min-h-12 min-w-0 items-center justify-between gap-1 rounded-lg border px-2 py-2 text-xs font-semibold shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:text-sm md:inline-flex md:min-h-10 md:w-auto md:gap-3 md:px-3.5 ${
                  selected
                    ? statusFilterStyles[status]
                    : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-primary))] hover:border-slate-400"
                }`}
              >
                <NotulensiStatusLabel
                  status={status}
                  className="min-w-0 gap-1 text-left leading-tight md:gap-1.5"
                />
                <span
                  className={`min-w-5 shrink-0 rounded px-1 py-0.5 text-center text-[11px] tabular-nums md:min-w-6 md:px-1.5 md:text-xs ${
                    selected ? "bg-black/20 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {statusCounts?.[status] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
    </div>
  );
}

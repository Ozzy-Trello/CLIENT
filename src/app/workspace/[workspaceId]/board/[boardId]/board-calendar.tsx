"use client";

import {
  addMonths,
  monthGrid,
  toDateKey,
  toMonthKey,
  todayKey,
} from "@components/notulensi/notulensi-calendar-utils";
import {
  BoardCalendarCard,
  getBoardCalendarCards,
  getBoardCalendarIgnoredLists,
  getBoardCalendarSummary,
  updateBoardCalendarIgnoredLists,
} from "@api/board";
import { useLists } from "@hooks/list";
import { usePermissions } from "@hooks/account";
import { Alert, Button, Popover, Spin, Checkbox, message } from "antd";
import { ChevronLeft, ChevronRight, FileImage, ListFilter } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

/* eslint-disable @next/next/no-img-element */

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_FORMAT = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

const monthLabel = (monthKey: string) => MONTH_FORMAT.format(new Date(`${monthKey}-01T12:00:00`));
const dateLabel = (dateKey: string) => DATE_FORMAT.format(new Date(`${dateKey}T12:00:00`));

const lastDayOf = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
};

/** Whole displayed month, expressed as the API's from/to range. */
const monthRange = (monthKey: string) => ({
  from: `${monthKey}-01`,
  to: lastDayOf(monthKey),
});

type Props = {
  boardId: string;
  onOpenCard: (cardId: string, listId: string) => void;
};

export default function BoardCalendar({ boardId, onOpenCard }: Props) {
  const today = todayKey();
  const [month, setMonth] = useState(() => toMonthKey(today));
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { lists } = useLists(boardId);
  const { isSuperAdmin } = usePermissions();
  const queryClient = useQueryClient();

  // Ignored lists live on the board (super-admin controlled) so every
  // member counts the same deadlines.
  const ignoredQuery = useQuery({
    queryKey: ["boardCalendarIgnoredLists", boardId],
    queryFn: () => getBoardCalendarIgnoredLists(boardId),
    enabled: Boolean(boardId),
  });
  const ignoredListIds = useMemo(
    () => ignoredQuery.data?.data ?? [],
    [ignoredQuery.data]
  );

  const saveIgnored = useMutation({
    mutationFn: (listIds: string[]) =>
      updateBoardCalendarIgnoredLists(boardId, listIds),
    onSuccess: (response) => {
      queryClient.setQueryData(["boardCalendarIgnoredLists", boardId], response);
      queryClient.invalidateQueries({ queryKey: ["boardCalendar", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boardCalendarSummary", boardId] });
    },
    onError: () => {
      message.error("Gagal menyimpan pengaturan list");
    },
  });

  const range = useMemo(() => monthRange(month), [month]);
  const settingReady = ignoredQuery.isSuccess;

  const cardsQuery = useQuery({
    queryKey: ["boardCalendar", boardId, month, ignoredListIds],
    queryFn: () => getBoardCalendarCards(boardId, range.from, range.to, ignoredListIds),
    enabled: Boolean(boardId) && settingReady,
    placeholderData: (previous) => previous,
  });

  const nextMonth = useMemo(() => addMonths(month, 1), [month]);
  const summaryQuery = useQuery({
    queryKey: ["boardCalendarSummary", boardId, month, ignoredListIds],
    queryFn: () =>
      getBoardCalendarSummary(
        boardId,
        {
          today,
          monthStart: `${month}-01`,
          monthEnd: lastDayOf(month),
          nextMonthStart: `${nextMonth}-01`,
          nextMonthEnd: lastDayOf(nextMonth),
        },
        ignoredListIds
      ),
    enabled: Boolean(boardId) && settingReady,
    placeholderData: (previous) => previous,
  });

  const cards = useMemo(() => cardsQuery.data?.data ?? [], [cardsQuery.data]);

  const byDate = useMemo(() => {
    const map = new Map<string, BoardCalendarCard[]>();
    for (const card of cards) {
      const key = toDateKey(card.dueDate);
      const bucket = map.get(key);
      if (bucket) bucket.push(card);
      else map.set(key, [card]);
    }
    return map;
  }, [cards]);

  const grid = useMemo(() => monthGrid(month), [month]);
  const selectedCards = byDate.get(selectedDate) ?? [];
  const summary = summaryQuery.data?.data;

  const goToMonth = (target: string) => {
    setMonth(target);
    setSelectedDate(target === toMonthKey(today) ? today : `${target}-01`);
  };

  if (cardsQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        className="m-4"
        message="Gagal memuat kalender board"
        action={<Button onClick={() => cardsQuery.refetch()}>Retry</Button>}
      />
    );
  }

  const listFilterContent = (
    <div className="flex max-h-72 w-64 flex-col gap-1 overflow-y-auto">
      <span className="mb-1 text-xs text-gray-500">
        List yang dicentang diabaikan dalam perhitungan due date. Berlaku
        untuk semua pengguna board ini.
      </span>
      {(lists ?? []).map((list: any) => (
        <Checkbox
          key={list.id}
          checked={ignoredListIds.includes(list.id)}
          disabled={saveIgnored.isPending}
          onChange={(event) =>
            saveIgnored.mutate(
              event.target.checked
                ? [...ignoredListIds, list.id]
                : ignoredListIds.filter((id) => id !== list.id)
            )
          }
        >
          <span className="text-sm">{list.name}</span>
        </Checkbox>
      ))}
    </div>
  );

  const summaryCards = [
    {
      label: "Overdue",
      count: summary?.overdue,
      caption: "Belum selesai, sebelum hari ini",
      accent: "text-red-600",
    },
    {
      label: "Dateline bulan ini",
      count: summary?.dueThisMonth,
      caption: monthLabel(month),
    },
    {
      label: "Dateline bulan depan",
      count: summary?.dueNextMonth,
      caption: monthLabel(nextMonth),
    },
  ];

  return (
    // The workspace layout locks overflow on board pages so kanban can drag
    // horizontally, so the calendar has to carry its own vertical scroll.
    <div className="flex max-h-[calc(100dvh-95px)] flex-col gap-3 overflow-y-auto overscroll-contain p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          icon={<ChevronLeft size={16} />}
          aria-label="Bulan sebelumnya"
          onClick={() => goToMonth(addMonths(month, -1))}
        />
        <h3 className="m-0 min-w-[140px] text-center text-base font-semibold">
          {monthLabel(month)}
        </h3>
        <Button
          icon={<ChevronRight size={16} />}
          aria-label="Bulan berikutnya"
          onClick={() => goToMonth(addMonths(month, 1))}
        />
        <Button onClick={() => goToMonth(toMonthKey(today))}>Bulan ini</Button>
        {isSuperAdmin() ? (
          <Popover content={listFilterContent} trigger="click" placement="bottomLeft">
            <Button icon={<ListFilter size={16} />} loading={saveIgnored.isPending}>
              Abaikan list
              {ignoredListIds.length > 0 && (
                <span className="ml-1 rounded bg-blue-600 px-1.5 text-xs font-semibold text-white">
                  {ignoredListIds.length}
                </span>
              )}
            </Button>
          </Popover>
        ) : (
          ignoredListIds.length > 0 && (
            <span className="text-xs text-gray-500">
              {ignoredListIds.length} list diabaikan dari perhitungan
            </span>
          )
        )}
        {(cardsQuery.isFetching || summaryQuery.isFetching) && <Spin size="small" />}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Ringkasan dateline">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
          >
            <span className="text-sm text-[rgb(var(--color-text-primary))]">{card.label}</span>
            <b className={`block text-2xl ${card.accent ?? ""}`}>
              {card.count === undefined ? "…" : card.count.toLocaleString("id-ID")}
            </b>
            <span className="text-xs text-gray-500">{card.caption}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, index) =>
              cell.dateKey ? (
                <button
                  key={cell.dateKey}
                  type="button"
                  aria-pressed={selectedDate === cell.dateKey}
                  aria-label={`${dateLabel(cell.dateKey)}, ${byDate.get(cell.dateKey)?.length ?? 0} card jatuh tempo`}
                  onClick={() => setSelectedDate(cell.dateKey!)}
                  className={`flex min-h-12 flex-col items-start gap-1 rounded-lg border p-1 text-left sm:min-h-16 sm:p-1.5 ${
                    selectedDate === cell.dateKey
                      ? "border-blue-600 shadow-[inset_0_0_0_1px_rgb(37,99,235)]"
                      : "border-[rgb(var(--color-border))] hover:border-slate-400"
                  } ${cell.dateKey === today ? "bg-blue-50" : "bg-[rgb(var(--color-surface))]"}`}
                >
                  <span className="text-xs font-semibold">{cell.dayNumber}</span>
                  {(byDate.get(cell.dateKey)?.length ?? 0) > 0 && (
                    <span
                      className={`rounded px-1 text-[10px] font-semibold text-white ${
                        cell.dateKey < today ? "bg-red-500" : "bg-blue-600"
                      }`}
                    >
                      {byDate.get(cell.dateKey)!.length}
                      <span className="hidden sm:inline"> card</span>
                    </span>
                  )}
                </button>
              ) : (
                <span key={`empty-${index}`} aria-hidden="true" />
              )
            )}
          </div>
        </div>

        <aside aria-live="polite" className="flex flex-col gap-2">
          <h3 className="m-0 text-base font-semibold">{dateLabel(selectedDate)}</h3>
          <div className="text-xs text-gray-500">
            {selectedCards.length} card jatuh tempo
          </div>
          {/* Nested scrolling traps touch on mobile, so the list only gets its
              own scroller next to the grid on large screens. */}
          <div className="flex flex-col gap-2 pr-1 lg:max-h-[calc(100dvh-320px)] lg:overflow-y-auto">
            {cardsQuery.isLoading ? (
              <Spin />
            ) : selectedCards.length ? (
              selectedCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onOpenCard(card.id, card.listId)}
                  className="flex items-center gap-2 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-2 text-left hover:border-blue-400"
                >
                  {card.cover ? (
                    <img
                      src={card.cover}
                      alt=""
                      loading="lazy"
                      className="h-10 w-14 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                      <FileImage size={16} className="text-gray-400" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[rgb(var(--color-text-primary))]">
                      {card.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                      <span className="truncate">{card.listName}</span>
                      {card.isComplete && (
                        <span className="font-semibold text-emerald-600">Selesai</span>
                      )}
                      {!card.isComplete && selectedDate < today && (
                        <span className="font-semibold text-red-600">Overdue</span>
                      )}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="text-xs text-gray-500">Tidak ada card jatuh tempo tanggal ini.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import {
  addMonths,
  monthGrid,
  toDateKey,
  toMonthKey,
  todayKey,
} from "@components/notulensi/notulensi-calendar-utils";
import { BoardCalendarCard, getBoardCalendarCards } from "@api/board";
import { Alert, Button, Spin } from "antd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_FORMAT = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

const monthLabel = (monthKey: string) => MONTH_FORMAT.format(new Date(`${monthKey}-01T12:00:00`));
const dateLabel = (dateKey: string) => DATE_FORMAT.format(new Date(`${dateKey}T12:00:00`));

/** Whole displayed month, expressed as the API's from/to range. */
const monthRange = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(lastDay).padStart(2, "0")}` };
};

type Props = {
  boardId: string;
  onOpenCard: (cardId: string, listId: string) => void;
};

export default function BoardCalendar({ boardId, onOpenCard }: Props) {
  const today = todayKey();
  const [month, setMonth] = useState(() => toMonthKey(today));
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const range = useMemo(() => monthRange(month), [month]);
  const cardsQuery = useQuery({
    queryKey: ["boardCalendar", boardId, month],
    queryFn: () => getBoardCalendarCards(boardId, range.from, range.to),
    enabled: Boolean(boardId),
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

  const goToMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    setSelectedDate(nextMonth === toMonthKey(today) ? today : `${nextMonth}-01`);
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

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 md:p-4">
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
        {cardsQuery.isFetching && <Spin size="small" />}
        <span className="hidden text-xs text-gray-500 sm:inline">
          {cards.length} kartu ber-due-date bulan ini
        </span>
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
                  aria-label={`${dateLabel(cell.dateKey)}, ${byDate.get(cell.dateKey)?.length ?? 0} kartu jatuh tempo`}
                  onClick={() => setSelectedDate(cell.dateKey!)}
                  className={`flex min-h-14 flex-col items-start gap-1 rounded-lg border p-1 text-left sm:min-h-20 sm:p-1.5 ${
                    selectedDate === cell.dateKey
                      ? "border-blue-600 shadow-[inset_0_0_0_1px_rgb(37,99,235)]"
                      : "border-[rgb(var(--color-border))] hover:border-slate-400"
                  } ${cell.dateKey === today ? "bg-blue-50" : "bg-[rgb(var(--color-surface))]"}`}
                >
                  <span className="text-xs font-semibold">{cell.dayNumber}</span>
                  {(byDate.get(cell.dateKey)?.length ?? 0) > 0 && (
                    <>
                      {/* Mobile: count chip only. Desktop: first card names. */}
                      <span
                        className={`rounded px-1 text-[10px] font-semibold text-white sm:hidden ${
                          cell.dateKey < today ? "bg-red-500" : "bg-blue-600"
                        }`}
                      >
                        {byDate.get(cell.dateKey)!.length}
                      </span>
                      <span className="hidden w-full min-w-0 flex-col gap-0.5 sm:flex">
                        {byDate.get(cell.dateKey)!.slice(0, 2).map((card) => (
                          <span
                            key={card.id}
                            className={`truncate rounded px-1 text-[10px] leading-4 text-white ${
                              card.isComplete
                                ? "bg-emerald-600"
                                : cell.dateKey! < today
                                  ? "bg-red-500"
                                  : "bg-blue-600"
                            }`}
                          >
                            {card.name}
                          </span>
                        ))}
                        {byDate.get(cell.dateKey)!.length > 2 && (
                          <span className="text-[10px] text-gray-500">
                            +{byDate.get(cell.dateKey)!.length - 2} lagi
                          </span>
                        )}
                      </span>
                    </>
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
            {selectedCards.length} kartu jatuh tempo
          </div>
          {cardsQuery.isLoading ? (
            <Spin />
          ) : selectedCards.length ? (
            selectedCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onOpenCard(card.id, card.listId)}
                className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2 text-left hover:border-blue-400"
              >
                <div className="truncate text-sm font-medium text-[rgb(var(--color-text-primary))]">
                  {card.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span className="truncate">{card.listName}</span>
                  {card.isComplete && (
                    <span className="font-semibold text-emerald-600">Selesai</span>
                  )}
                  {!card.isComplete && selectedDate < today && (
                    <span className="font-semibold text-red-600">Overdue</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-500">Tidak ada kartu jatuh tempo tanggal ini.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

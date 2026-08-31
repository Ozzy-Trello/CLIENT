import { getChatDateSeparator } from "./chat-date-separator";

const localIso = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString();

describe("getChatDateSeparator", () => {
  const now = new Date(2026, 7, 23, 10);

  it("labels the first message from today", () => {
    expect(getChatDateSeparator(localIso(2026, 8, 23), undefined, now)).toBe("Hari ini");
  });

  it("does not repeat a separator within the same day", () => {
    expect(getChatDateSeparator(
      localIso(2026, 8, 23, 14),
      localIso(2026, 8, 23, 9),
      now,
    )).toBeNull();
  });

  it("labels yesterday when the calendar day changes", () => {
    expect(getChatDateSeparator(
      localIso(2026, 8, 22, 14),
      localIso(2026, 8, 21, 20),
      now,
    )).toBe("Kemarin");
  });

  it("uses a full Indonesian date for older messages", () => {
    expect(getChatDateSeparator(
      localIso(2025, 12, 31),
      undefined,
      now,
    )).toBe("31 Desember 2025");
  });

  it("ignores invalid timestamps", () => {
    expect(getChatDateSeparator("invalid", undefined, now)).toBeNull();
  });
});

import { ListSortKey } from "./draggable-list/sort-options";

/**
 * Cache kartu per list dipakai bersama dua pemuat: board (yang mengirim
 * sort_by) dan useCards (yang tidak). Ketika WebSocket meng-invalidate kunci
 * itu, useCards mengisi ulang cache dengan urutan manual — dan penyelaras
 * cache menyalinnya ke layar, sehingga urutan pilihan admin tampak muncul
 * sekejap lalu kembali seperti semula.
 *
 * Gerbang di bawah ini yang mencegahnya. Diambil apa adanya dari page.tsx.
 */
function bolehSalinDariCache(
  listId: string,
  listSortKeys: Record<string, ListSortKey>
): boolean {
  return !listSortKeys[listId];
}

const LIST_TERURUT = "a3e0dc41-e0c9-49cb-979e-879757f48252";
const LIST_MANUAL = "b728910d-5c2e-482a-854d-593c6115541d";

describe("gerbang penyelaras cache", () => {
  it("menolak menimpa list yang memakai urutan pilihan", () => {
    const keys = { [LIST_TERURUT]: "created_asc" as ListSortKey };
    expect(bolehSalinDariCache(LIST_TERURUT, keys)).toBe(false);
  });

  it("tetap menyalin untuk list yang urutannya manual", () => {
    const keys = { [LIST_TERURUT]: "created_asc" as ListSortKey };
    expect(bolehSalinDariCache(LIST_MANUAL, keys)).toBe(true);
  });

  // Tanpa pilihan apa pun, perilaku lama harus utuh: penyelaras tetap jalan
  // supaya perubahan dari automation dan WebSocket tetap terlihat.
  it("menyalin semua list saat belum ada pilihan", () => {
    expect(bolehSalinDariCache(LIST_TERURUT, {})).toBe(true);
    expect(bolehSalinDariCache(LIST_MANUAL, {})).toBe(true);
  });

  it("kembali menyalin setelah pilihan dikembalikan ke manual", () => {
    const keys: Record<string, ListSortKey> = {
      [LIST_TERURUT]: "created_asc",
    };
    expect(bolehSalinDariCache(LIST_TERURUT, keys)).toBe(false);

    // handleSortChange menghapus entri saat admin memilih Manual order.
    delete keys[LIST_TERURUT];
    expect(bolehSalinDariCache(LIST_TERURUT, keys)).toBe(true);
  });
});

import { LIST_SORT_OPTIONS, ListSortKey } from "./sort-options";

/**
 * Board hanya memuat 10 kartu per list, jadi urutan wajib dikerjakan server.
 * Kunci ini menjaga tiap pilihan tetap punya pasangan sort_by/sort_order yang
 * dikenal backend; salah satu meleset membuat urutan diam-diam kembali manual.
 */
function sortParams(sortKey: ListSortKey | undefined) {
  const option = LIST_SORT_OPTIONS.find((item) => item.key === sortKey);
  if (!option || option.key === "manual") {
    return { sortBy: undefined, sortOrder: undefined };
  }
  return { sortBy: option.sortBy, sortOrder: option.sortOrder };
}

describe("sortParams", () => {
  it("tidak mengirim urutan untuk manual", () => {
    expect(sortParams("manual")).toEqual({
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it("tidak mengirim urutan saat pilihan belum diatur", () => {
    expect(sortParams(undefined)).toEqual({
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it("memetakan Oldest first ke created_at menaik", () => {
    expect(sortParams("created_asc")).toEqual({
      sortBy: "created_at",
      sortOrder: "asc",
    });
  });

  it("memetakan Newest first ke created_at menurun", () => {
    expect(sortParams("created_desc")).toEqual({
      sortBy: "created_at",
      sortOrder: "desc",
    });
  });

  it("memetakan urutan nama ke kedua arah", () => {
    expect(sortParams("name_asc")).toEqual({
      sortBy: "name",
      sortOrder: "asc",
    });
    expect(sortParams("name_desc")).toEqual({
      sortBy: "name",
      sortOrder: "desc",
    });
  });
});

describe("LIST_SORT_OPTIONS", () => {
  // Backend hanya menerima tiga kolom ini; kolom lain diabaikan diam-diam
  // dan kartu kembali terurut manual tanpa tanda apa pun.
  it("hanya memakai kolom yang dikenal backend", () => {
    for (const option of LIST_SORT_OPTIONS) {
      expect(["order", "created_at", "name"]).toContain(option.sortBy);
      expect(["asc", "desc"]).toContain(option.sortOrder);
    }
  });

  it("tidak punya kunci ganda", () => {
    const keys = LIST_SORT_OPTIONS.map((option) => option.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

import { getListSortPreferences } from "./list";
import { api } from ".";

jest.mock(".", () => ({
  __esModule: true,
  api: { get: jest.fn() },
}));

const LIST_ID = "a3e0dc41-e0c9-49cb-979e-879757f48252";

beforeEach(() => jest.clearAllMocks());

/**
 * Tiruan interceptor response, yang mengubah seluruh kunci JSON ke camelCase.
 * Paket aslinya ESM dan tidak bisa dimuat Jest, jadi perilakunya ditiru:
 * pemisah dibuang dan huruf sesudahnya dibesarkan — termasuk pada UUID.
 */
function toCamel(value: any): any {
  if (Array.isArray(value)) return value.map(toCamel);
  if (value === null || typeof value !== "object") return value;

  const out: Record<string, any> = {};
  for (const [key, inner] of Object.entries(value)) {
    const camel = key.replace(/[-_\s]+(.)?/g, (_match, chr: string | undefined) =>
      chr ? chr.toUpperCase() : ""
    );
    out[camel] = toCamel(inner);
  }
  return out;
}

function respond(payload: unknown) {
  (api.get as jest.Mock).mockResolvedValue({ data: toCamel(payload) });
}

describe("getListSortPreferences", () => {
  it("menyusun peta dari deretan tanpa merusak id list", async () => {
    respond({ data: [{ list_id: LIST_ID, sort_key: "created_asc" }] });

    await expect(getListSortPreferences("board-1")).resolves.toEqual({
      [LIST_ID]: "created_asc",
    });
  });

  // Bentuk peta ber-kunci UUID adalah bug yang membuat urutan tampak tereset
  // tiap refresh: tanda hubungnya hilang sehingga kunci tidak pernah cocok.
  it("camelCase memang merusak UUID kalau dipakai sebagai kunci", () => {
    const rusak = Object.keys(toCamel({ [LIST_ID]: "created_asc" }))[0];
    expect(rusak).not.toBe(LIST_ID);
    expect(rusak).not.toContain("-");
  });

  it("mengembalikan peta kosong saat belum ada pilihan", async () => {
    respond({ data: [] });
    await expect(getListSortPreferences("board-1")).resolves.toEqual({});
  });

  // Board harus tetap terbuka walau bentuk jawabannya tidak terduga.
  it("tahan terhadap jawaban yang bukan deretan", async () => {
    respond({ data: null });
    await expect(getListSortPreferences("board-1")).resolves.toEqual({});
  });

  it("melewati baris yang tidak lengkap", async () => {
    respond({
      data: [
        { list_id: LIST_ID, sort_key: "name_asc" },
        { list_id: "", sort_key: "created_asc" },
        { list_id: "list-2" },
      ],
    });

    await expect(getListSortPreferences("board-1")).resolves.toEqual({
      [LIST_ID]: "name_asc",
    });
  });
});

import { getShippingWeights, getJunction } from "./category";
import { api } from ".";

jest.mock(".", () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

// Catatan: interceptor di src/api/index.tsx sudah mengubah response backend
// dari snake_case ke camelCase sebelum sampai ke fungsi-fungsi ini.
describe("getShippingWeights", () => {
  it("meneruskan bentuk camelCase apa adanya", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        data: [
          {
            mainCategoryId: "cat-1",
            name: "Polo",
            displayOrder: 1,
            variants: [
              {
                junctionId: "j-1",
                subcategoryId: "sub-1",
                name: "TPD",
                shippingWeightGrams: 250,
                displayOrder: 2,
              },
            ],
          },
        ],
      },
    });

    const result = await getShippingWeights("workspace-1");

    expect(result.data?.[0].variants[0]).toEqual({
      junctionId: "j-1",
      subcategoryId: "sub-1",
      name: "TPD",
      shippingWeightGrams: 250,
      displayOrder: 2,
    });
  });

  it("memanggil endpoint yang benar dengan header workspace", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [] } });

    await getShippingWeights("workspace-1");

    expect(mockApi.get).toHaveBeenCalledWith("/category/shipping-weights", {
      headers: { "workspace-id": "workspace-1" },
    });
  });
});

describe("transformJunction berat ongkir", () => {
  const junction = (overrides: Record<string, unknown>) => ({
    id: "j-1",
    mainCategoryId: "cat-1",
    subcategoryId: "sub-1",
    calculationWeight: 3.15,
    displayOrder: 1,
    isTotalField: false,
    isEditableTotal: false,
    operator: "divide",
    ...overrides,
  });

  it("membaca berat dan centang ongkir", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        data: junction({ shippingWeightGrams: 250, includeInShipping: true }),
      },
    });

    const result = await getJunction("j-1", "workspace-1");

    expect(result.data?.shippingWeightGrams).toBe(250);
    expect(result.data?.includeInShipping).toBe(true);
  });

  it("memakai null dan false kalau field belum ada", async () => {
    mockApi.get.mockResolvedValue({ data: { data: junction({}) } });

    const result = await getJunction("j-1", "workspace-1");

    expect(result.data?.shippingWeightGrams).toBeNull();
    expect(result.data?.includeInShipping).toBe(false);
  });

  it("memperlakukan berat null sebagai null, bukan nol", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        data: junction({ shippingWeightGrams: null, includeInShipping: false }),
      },
    });

    const result = await getJunction("j-1", "workspace-1");

    expect(result.data?.shippingWeightGrams).toBeNull();
  });

  it("mengubah berat berbentuk string jadi angka", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        data: junction({ shippingWeightGrams: "300", includeInShipping: true }),
      },
    });

    const result = await getJunction("j-1", "workspace-1");

    expect(result.data?.shippingWeightGrams).toBe(300);
  });

  it("tetap membaca bentuk snake_case kalau interceptor dilewati", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        data: {
          id: "j-1",
          operator: "divide",
          shipping_weight_grams: 180,
          include_in_shipping: true,
        },
      },
    });

    const result = await getJunction("j-1", "workspace-1");

    expect(result.data?.shippingWeightGrams).toBe(180);
    expect(result.data?.includeInShipping).toBe(true);
  });
});

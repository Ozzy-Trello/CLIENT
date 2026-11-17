import type { MiniWarehouseRequestProduct } from "@api/mini-warehouse";
import type { OzzyProductWithSource } from "@api/ozzy-warehouse";
import { mergeRequestProducts } from "./mergeRequestProducts";

const accurateProduct: OzzyProductWithSource = {
  id: 1,
  accurateDbId: 1880451,
  accurateId: 2110,
  name: "Baterai Accurate",
  sku: "PKP-57",
  barcode: "123",
  unitType: "pcs",
  unitPrice: "1000",
  quantity: "50",
  source: "MPI",
};

const miniProduct: MiniWarehouseRequestProduct = {
  id: "local-catalog-id",
  accurateDbId: "1880451",
  accurateId: "2110",
  itemName: "Baterai",
  itemCode: "PKP-57",
  source: "MPI",
  unitType: "pcs",
  availableQuantity: 0,
};

it("uses Mini Warehouse for a matching Accurate item even when portal stock is zero", () => {
  const oldCode = { ...accurateProduct, sku: "PKP-57-LAMA" };
  expect(mergeRequestProducts([oldCode], [miniProduct])).toEqual([
    { key: "mini:1880451:2110", source: "mini_warehouse", product: miniProduct },
  ]);
});

it("matches the same code in the same source and keeps matching codes from other sources separate", () => {
  const staleId = { ...accurateProduct, accurateId: 101 };
  const hikmat = { ...accurateProduct, accurateDbId: 1880365, source: "Hikmat" };
  expect(mergeRequestProducts([staleId, hikmat], [miniProduct])).toEqual([
    { key: "mini:1880451:2110", source: "mini_warehouse", product: miniProduct },
    { key: "accurate:Hikmat:2110", source: "accurate", product: hikmat },
  ]);
});

it("keeps local-only products and excludes Non Persediaan without a local catalog entry", () => {
  const unsynced = {
    ...accurateProduct,
    accurateId: 99,
    sku: "UNSYNCED",
    itemTypeName: "Non Persediaan",
  };
  const inventory = { ...accurateProduct, accurateId: 55, sku: "KAIN", itemTypeName: "Persediaan" };
  expect(mergeRequestProducts([unsynced, inventory], [miniProduct]).map(({ source, product }) => [
    source,
    "sku" in product ? product.sku : product.itemCode,
  ])).toEqual([
    ["mini_warehouse", "PKP-57"],
    ["accurate", "KAIN"],
  ]);
});

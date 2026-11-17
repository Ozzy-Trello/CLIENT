import type { MiniWarehouseRequestProduct } from "@api/mini-warehouse";
import type { OzzyProductWithSource } from "@api/ozzy-warehouse";

export function mergeRequestProducts(
  accurateProducts: OzzyProductWithSource[],
  miniProducts: MiniWarehouseRequestProduct[],
) {
  const idKey = (dbId: string | number, itemId: string | number) => `${dbId}:${itemId}`;
  const codeKey = (source: string, code: string) => `${source.trim().toLowerCase()}:${code.trim()}`;
  const miniIds = new Set(miniProducts.map((item) => idKey(item.accurateDbId, item.accurateId)));
  const miniCodes = new Set(miniProducts.map((item) => codeKey(item.source, item.itemCode)));

  return [
    ...miniProducts.map((product) => ({
      source: "mini_warehouse" as const,
      product,
      key: `mini:${idKey(product.accurateDbId, product.accurateId)}`,
    })),
    ...accurateProducts
      .filter((item) =>
        item.sku &&
        item.itemTypeName?.trim().toLowerCase() !== "non persediaan" &&
        !miniIds.has(idKey(item.accurateDbId, item.accurateId)) &&
        !miniCodes.has(codeKey(item.source, item.sku)),
      )
      .map((product) => ({
        source: "accurate" as const,
        product,
        key: `accurate:${product.source}:${product.accurateId ?? product.id}`,
      })),
  ];
}

import { rankCardSearchResults } from "./search-utils";

describe("rankCardSearchResults", () => {
  it("puts exact card-name matches before substring matches", () => {
    const results = rankCardSearchResults(
      [
        { id: "description-match", name: "Other card" },
        { id: "suffix-match", name: "Old GSA" },
        { id: "exact-match", name: "GSA" },
        { id: "prefix-match", name: "GSA Purchase" },
      ],
      "GSA",
    );

    expect(results.map((card) => card.id)).toEqual([
      "exact-match",
      "prefix-match",
      "suffix-match",
      "description-match",
    ]);
  });
});

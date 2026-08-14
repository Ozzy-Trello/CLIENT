import { parseNotulensiFilters, persistedNotulensiFilters } from "./notulensi-filter-storage";

describe("notulensi filter storage", () => {
  it("restores validated filters without the saved page", () => {
    expect(parseNotulensiFilters(JSON.stringify({
      search: "needle",
      status: ["new", "invalid"],
      assigneeIds: ["d9133f38-0eed-442a-a382-87d2f6084032", "invalid"],
      roleIds: ["35704a44-c9b8-4eb0-a230-8c0ca652e5e6"],
      scope: "all",
      sortBy: "due_date",
      sortOrder: "desc",
      page: 8,
      limit: 50,
    }), false)).toEqual({
      search: "needle",
      status: ["new"],
      priority: undefined,
      assigneeIds: ["d9133f38-0eed-442a-a382-87d2f6084032"],
      roleIds: ["35704a44-c9b8-4eb0-a230-8c0ca652e5e6"],
      dueFrom: undefined,
      dueTo: undefined,
      scope: "related",
      sortBy: "due_date",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    });
  });

  it("omits page when persisting", () => {
    expect(persistedNotulensiFilters({ scope: "assigned", page: 3, limit: 20 })).toEqual({
      scope: "assigned",
      limit: 20,
    });
  });
});

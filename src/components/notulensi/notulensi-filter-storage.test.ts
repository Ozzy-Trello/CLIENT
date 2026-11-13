import { parseNotulensiFilters, persistedNotulensiFilters } from "./notulensi-filter-storage";

describe("notulensi filter storage", () => {
  it("restores validated filters without the saved page", () => {
    expect(parseNotulensiFilters(JSON.stringify({
      search: "needle",
      status: ["new", "invalid"],
      assigneeIds: ["d9133f38-0eed-442a-a382-87d2f6084032", "invalid"],
      roleIds: ["35704a44-c9b8-4eb0-a230-8c0ca652e5e6"],
      divisionIds: ["a879c82a-1f7f-4d17-81b5-704a241806e6", "invalid"],
      taskOrigin: ["General", "bad"],
      scope: ["all", "assigned"],
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
      divisionIds: ["a879c82a-1f7f-4d17-81b5-704a241806e6"],
      taskOrigin: ["General"],
      dueFrom: undefined,
      dueTo: undefined,
      scope: ["assigned"],
      sortBy: "due_date",
      sortOrder: "desc",
      page: 1,
      limit: 50,
    });
  });

  it("omits page when persisting", () => {
    expect(persistedNotulensiFilters({ scope: ["assigned", "created"], page: 3, limit: 20 })).toEqual({
      scope: ["assigned", "created"],
      limit: 20,
    });
  });
});

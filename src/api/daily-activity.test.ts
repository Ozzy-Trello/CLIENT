import { api } from "@api/index";
import { getDailyActivityConfiguration } from "./daily-activity";

jest.mock("@api/index", () => ({ api: { get: jest.fn(), post: jest.fn() } }));

const mockedApi = api as jest.Mocked<typeof api>;

describe("daily activity configuration api", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes missing configuration collections to empty arrays", async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { roles: [{ id: "role-1", name: "SPV" }] } } } as any);

    await expect(getDailyActivityConfiguration()).resolves.toEqual({
      roles: [{ id: "role-1", name: "SPV" }],
      users: [],
      role_rules: [],
      user_overrides: [],
      settings: [],
      holidays: [],
    });
  });

  it("accepts camelCase collections when returned by a compatible server response", async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { roleRules: [{ id: "rule-1" }], userOverrides: [{ id: "override-1" }] } } } as any);

    const result = await getDailyActivityConfiguration();
    expect(result.role_rules).toEqual([{ id: "rule-1" }]);
    expect(result.user_overrides).toEqual([{ id: "override-1" }]);
  });

  it("normalizes camelCase scope preview and manager fields before the UI reads them", async () => {
    mockedApi.post = jest.fn().mockResolvedValue({ data: { data: { userIds: ["user-1"], users: [{ id: "user-1", roleId: "role-1", roleName: "SPV", managerId: null }] } } }) as any;
    const { previewDailyActivityScope, getDailyActivityStructure } = await import("./daily-activity");
    await expect(previewDailyActivityScope("user-1")).resolves.toMatchObject({ user_ids: ["user-1"] });
    mockedApi.get.mockResolvedValue({ data: { data: [{ id: "user-1", username: "Garry", roleId: "role-1", roleName: "SPV", managerId: null }] } } as any);
    await expect(getDailyActivityStructure()).resolves.toMatchObject([{ role_id: "role-1", role_name: "SPV", manager_id: null }]);
  });
});

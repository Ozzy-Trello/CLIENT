import { api } from "@api/index";
import { getDailyActivityConfiguration } from "./daily-activity";

jest.mock("@api/index", () => ({ api: { get: jest.fn() } }));

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
});

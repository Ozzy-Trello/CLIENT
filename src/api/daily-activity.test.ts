import { api } from "@api/index";
import { addDailyActivityItemComment, getDailyActivityConfiguration, getDailyActivityItemComments, reviewDailyActivityReport } from "./daily-activity";

jest.mock("@api/index", () => ({ api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn() } }));

const mockedApi = api as jest.Mocked<typeof api>;

describe("daily activity configuration api", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes missing configuration collections to empty arrays", async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { roles: [{ id: "role-1", name: "SPV" }] } } } as any);

    await expect(getDailyActivityConfiguration()).resolves.toEqual({
      roles: [{ id: "role-1", name: "SPV", manager_role_id: null }],
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

  it("uses the direct-manager review and per-activity comment endpoints", async () => {
    mockedApi.put.mockResolvedValue({ data: { data: { id: "report-1", reviewed_by: "manager-1" } } } as any);
    mockedApi.get.mockResolvedValue({ data: { data: [{ id: "comment-1", item_id: "item-1", user_id: "manager-1", content: "Please clarify", user: { id: "manager-1", username: "Manager" } }] } } as any);
    mockedApi.post.mockResolvedValue({ data: { data: { id: "comment-2" } } } as any);

    await expect(reviewDailyActivityReport("report-1")).resolves.toMatchObject({ id: "report-1" });
    await expect(getDailyActivityItemComments("item-1")).resolves.toMatchObject([{ id: "comment-1", item_id: "item-1", user_id: "manager-1" }]);
    await addDailyActivityItemComment("item-1", "Thanks", "workspace-1");

    expect(mockedApi.put).toHaveBeenCalledWith("/daily-activity/reports/report-1/review");
    expect(mockedApi.get).toHaveBeenCalledWith("/daily-activity/items/item-1/comments");
    expect(mockedApi.post).toHaveBeenCalledWith("/daily-activity/items/item-1/comments", { content: "Thanks", workspace_id: "workspace-1" });
  });

  it("normalizes camelCase scope preview and role hierarchy fields", async () => {
    mockedApi.post = jest.fn().mockResolvedValue({ data: { data: { userIds: ["user-1"], users: [{ id: "user-1", roleId: "role-1", roleName: "SPV" }] } } }) as any;
    const { previewDailyActivityScope, getDailyActivityStructure } = await import("./daily-activity");
    await expect(previewDailyActivityScope("user-1")).resolves.toMatchObject({ user_ids: ["user-1"] });
    mockedApi.get.mockResolvedValue({ data: { data: [{ id: "role-1", name: "SPV", managerRoleId: "role-2", members: [{ id: "user-1", username: "Garry", roleId: "role-1", roleName: "SPV" }] }] } } as any);
    await expect(getDailyActivityStructure()).resolves.toMatchObject([{ id: "role-1", manager_role_id: "role-2", members: [{ role_id: "role-1", role_name: "SPV" }] }]);
  });

  it("submits date-range leave requests and normalizes the approval response", async () => {
    const request = { id: "leave-1", user_id: "user-1", employee_name: "Rina", approver_role_id: "role-1", start_date: "2026-11-10", end_date: "2026-11-11", status: "pending" };
    mockedApi.post.mockResolvedValue({ data: { data: request } } as any);
    const { createDailyActivityLeaveRequest } = await import("./daily-activity");

    await expect(createDailyActivityLeaveRequest({ start_date: "2026-11-10", end_date: "2026-11-11", note: "Cuti" })).resolves.toMatchObject({
      user_id: "user-1",
      employee_name: "Rina",
      approver_role_id: "role-1",
      start_date: "2026-11-10",
      status: "pending",
    });
    expect(mockedApi.post).toHaveBeenCalledWith("/daily-activity/leave-requests", { start_date: "2026-11-10", end_date: "2026-11-11", note: "Cuti" });
  });
});

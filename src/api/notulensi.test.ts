import {
  createNotulensi,
  createNotulensiComment,
  deleteNotulensiAttachment,
  deleteNotulensiComment,
  deleteNotulensiPrivateNote,
  getNotulensiEligibleAssignees,
  exportNotulensi,
  getNotulensiList,
  getNotulensiPrivateNote,
  openNotulensi,
  runNotulensiAction,
  updateNotulensi,
  updateNotulensiComment,
  updateNotulensiPrivateNote,
  updateNotulensiProgress,
  uploadNotulensiAttachment,
} from "./notulensi";
import { api } from ".";

jest.mock(".", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("notulensi api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses snake_case list params and omits empty values", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [], pagination: {} } });

    await getNotulensiList("ws-1", {
      search: "line check",
      status: ["new", "in_progress"],
      priority: ["reg", "urgent"],
      assigneeId: "user-1",
      creatorId: "user-2",
      dueFrom: "2026-07-01T00:00:00.000Z",
      dueTo: "2026-07-31T23:59:59.999Z",
      scope: "related",
      page: 2,
      limit: 20,
    });

    expect(mockApi.get).toHaveBeenCalledWith("/workspace/ws-1/notulensi", {
      params: {
        search: "line check",
        status: "new,in_progress",
        priority: "reg,urgent",
        assignee_id: "user-1",
        creator_id: "user-2",
        due_from: "2026-07-01T00:00:00.000Z",
        due_to: "2026-07-31T23:59:59.999Z",
        scope: "related",
        page: 2,
        limit: 20,
      },
    });
  });

  it("creates with camelCase payload for interceptor conversion", async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: "n-1" } } });

    await createNotulensi("ws-1", {
      title: "Needle change",
      content: "<p>Change needle now</p>",
      priority: "reg",
      dueDate: "2026-07-29T12:00:00.000Z",
      assigneeIds: ["user-1"],
    });

    expect(mockApi.post).toHaveBeenCalledWith("/workspace/ws-1/notulensi", {
      title: "Needle change",
      content: "<p>Change needle now</p>",
      priority: "reg",
      dueDate: "2026-07-29T12:00:00.000Z",
      assigneeIds: ["user-1"],
    });
  });

  it("calls open, update, workflow action, progress, and assignee endpoints", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [] } });
    mockApi.patch.mockResolvedValue({ data: { data: { id: "n-1" } } });
    mockApi.post.mockResolvedValue({ data: { data: { id: "n-1" } } });

    await openNotulensi("ws-1", "n-1");
    await updateNotulensi("ws-1", "n-1", { title: "Updated", assigneeIds: ["user-1"] });
    await runNotulensiAction("ws-1", "n-1", "submit_review");
    await updateNotulensiProgress("ws-1", "n-1", 75);
    await getNotulensiEligibleAssignees("ws-1");

    expect(mockApi.post).toHaveBeenCalledWith("/workspace/ws-1/notulensi/n-1/open");
    expect(mockApi.patch).toHaveBeenCalledWith("/workspace/ws-1/notulensi/n-1", {
      title: "Updated",
      assigneeIds: ["user-1"],
    });
    expect(mockApi.post).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/actions/submit-review"
    );
    expect(mockApi.patch).toHaveBeenCalledWith("/workspace/ws-1/notulensi/n-1/progress", { progress: 75 });
    expect(mockApi.get).toHaveBeenCalledWith("/workspace/ws-1/notulensi/eligible-assignees");
  });

  it("calls comment endpoints with exact URLs", async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: "c-1" } } });
    mockApi.patch.mockResolvedValue({ data: { data: { id: "c-1" } } });
    mockApi.delete.mockResolvedValue({ data: { success: true } });

    await createNotulensiComment("ws-1", "n-1", { content: "Please confirm" });
    await updateNotulensiComment("ws-1", "n-1", "c-1", { content: "Updated" });
    await deleteNotulensiComment("ws-1", "n-1", "c-1");

    expect(mockApi.post).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/comments",
      { content: "Please confirm" }
    );
    expect(mockApi.patch).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/comments/c-1",
      { content: "Updated" }
    );
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/comments/c-1"
    );
  });

  it("calls private note endpoints with exact URLs", async () => {
    mockApi.get.mockResolvedValue({ data: { data: null } });
    mockApi.put.mockResolvedValue({ data: { data: { id: "pn-1" } } });
    mockApi.delete.mockResolvedValue({ data: { success: true } });

    await getNotulensiPrivateNote("ws-1", "n-1");
    await updateNotulensiPrivateNote("ws-1", "n-1", { content: "Only me" });
    await deleteNotulensiPrivateNote("ws-1", "n-1");

    expect(mockApi.get).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/private-note"
    );
    expect(mockApi.put).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/private-note",
      { content: "Only me" }
    );
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/private-note"
    );
  });

  it("uploads and deletes attachments with direct multipart endpoints", async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: "a-1" } } });
    mockApi.delete.mockResolvedValue({ data: { success: true } });
    const file = new File(["content"], "report.pdf", { type: "application/pdf" });

    await uploadNotulensiAttachment("ws-1", "n-1", file);
    await deleteNotulensiAttachment("ws-1", "n-1", "a-1");

    const formData = mockApi.post.mock.calls[0][1] as FormData;
    expect(mockApi.post).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/attachments",
      expect.any(FormData)
    );
    expect(formData.get("file")).toBe(file);
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/attachments/a-1"
    );
  });

  it("exports active filters without pagination", async () => {
    mockApi.get.mockResolvedValue({ data: { data: { tasks: [] } } });

    await exportNotulensi("ws-1", {
      search: "needle",
      status: ["new"],
      scope: "assigned",
      page: 3,
      limit: 50,
    });

    expect(mockApi.get).toHaveBeenCalledWith("/workspace/ws-1/notulensi/export", {
      params: { search: "needle", status: "new", scope: "assigned" },
    });
  });
});

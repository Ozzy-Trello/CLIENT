import {
  createNotulensi,
  createNotulensiComment,
  deleteNotulensi,
  deleteNotulensiComment,
  deleteNotulensiPrivateNote,
  getNotulensiDetail,
  getNotulensiList,
  getNotulensiPrivateNote,
  transitionNotulensiStatus,
  updateNotulensi,
  updateNotulensiComment,
  updateNotulensiPrivateNote,
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
      status: ["open", "in_progress"],
      priority: ["high", "urgent"],
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
        status: "open,in_progress",
        priority: "high,urgent",
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
      status: "draft",
      priority: "high",
      dueDate: "2026-07-29T12:00:00.000Z",
      assigneeIds: ["user-1"],
    });

    expect(mockApi.post).toHaveBeenCalledWith("/workspace/ws-1/notulensi", {
      title: "Needle change",
      content: "<p>Change needle now</p>",
      status: "draft",
      priority: "high",
      dueDate: "2026-07-29T12:00:00.000Z",
      assigneeIds: ["user-1"],
    });
  });

  it("calls detail, update, delete, and transition endpoints", async () => {
    mockApi.get.mockResolvedValue({ data: { data: { id: "n-1" } } });
    mockApi.patch.mockResolvedValue({ data: { data: { id: "n-1" } } });
    mockApi.delete.mockResolvedValue({ data: { success: true } });
    mockApi.post.mockResolvedValue({ data: { data: { id: "n-1" } } });

    await getNotulensiDetail("ws-1", "n-1");
    await updateNotulensi("ws-1", "n-1", { title: "Updated", assigneeIds: ["user-1"] });
    await deleteNotulensi("ws-1", "n-1");
    await transitionNotulensiStatus("ws-1", "n-1", { status: "completed" });

    expect(mockApi.get).toHaveBeenCalledWith("/workspace/ws-1/notulensi/n-1");
    expect(mockApi.patch).toHaveBeenCalledWith("/workspace/ws-1/notulensi/n-1", {
      title: "Updated",
      assigneeIds: ["user-1"],
    });
    expect(mockApi.delete).toHaveBeenCalledWith("/workspace/ws-1/notulensi/n-1");
    expect(mockApi.post).toHaveBeenCalledWith(
      "/workspace/ws-1/notulensi/n-1/status",
      { status: "completed" }
    );
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
});

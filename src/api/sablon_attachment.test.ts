import { getSablonAttachments, bulkUpsertSablonAttachments } from "./sablon_attachment";
import { api } from ".";

jest.mock(".", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("getSablonAttachments", () => {
  it("normalizes snake_case user_id to userId", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        status_code: 200,
        message: "ok",
        data: [
          {
            id: "row-1",
            card_id: "card-1",
            attachment_id: "att-1",
            user_id: "user-abc",
            amount: "5",
          },
        ],
      },
    });

    const result = await getSablonAttachments("card-1");
    expect(result.data[0].userId).toBe("user-abc");
    expect(result.data[0].amount).toBe(5);
  });

  it("sets userId to null when user_id is absent", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        status_code: 200,
        message: "ok",
        data: [{ id: "row-2", card_id: "card-1", attachment_id: "att-2", amount: "3" }],
      },
    });

    const result = await getSablonAttachments("card-1");
    expect(result.data[0].userId).toBeNull();
  });

  it("handles camelCase userId from response", async () => {
    mockApi.get.mockResolvedValue({
      data: {
        status_code: 200,
        message: "ok",
        data: [
          { id: "row-3", card_id: "card-1", attachment_id: "att-3", userId: "user-xyz", amount: 10 },
        ],
      },
    });

    const result = await getSablonAttachments("card-1");
    expect(result.data[0].userId).toBe("user-xyz");
  });
});

describe("bulkUpsertSablonAttachments", () => {
  it("posts rows and returns normalized data", async () => {
    mockApi.post.mockResolvedValue({
      data: {
        status_code: 200,
        message: "ok",
        data: [
          { id: "row-1", card_id: "card-1", attachment_id: "att-1", user_id: "user-abc", amount: "5" },
        ],
      },
    });

    const result = await bulkUpsertSablonAttachments([
      { cardId: "card-1", attachmentId: "att-1", userId: "user-abc", amount: 5 },
    ]);

    expect(mockApi.post).toHaveBeenCalledWith("/sablon-attachment/bulk", {
      rows: [{ cardId: "card-1", attachmentId: "att-1", userId: "user-abc", amount: 5 }],
    });
    expect(result.data[0].userId).toBe("user-abc");
  });
});

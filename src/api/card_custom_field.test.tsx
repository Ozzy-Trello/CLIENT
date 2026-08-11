import { setCardCustomFieldValue } from "./card_custom_field";
import { api } from ".";

jest.mock(".", () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe("card custom field api", () => {
  it("sends an explicit null when clearing a user value", async () => {
    mockApi.post.mockResolvedValue({ data: { data: [] } });

    await setCardCustomFieldValue("workspace-1", "card-1", "field-1", {
      valueUserId: null,
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      "/card/card-1/custom-field/field-1",
      expect.objectContaining({
        valueUserId: null,
        value_user_id: null,
      }),
      { headers: { "workspace-id": "workspace-1" } }
    );
  });
});

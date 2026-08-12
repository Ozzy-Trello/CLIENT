import { api } from ".";
import { markNotificationRead } from "./notifications";

jest.mock(".", () => ({ api: { patch: jest.fn() } }));

describe("notifications api", () => {
  it("marks one notification read", async () => {
    (api.patch as jest.Mock).mockResolvedValue({});

    await markNotificationRead("notification/1");

    expect(api.patch).toHaveBeenCalledWith("/notifications/notification%2F1/read");
  });
});

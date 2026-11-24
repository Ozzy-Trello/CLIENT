import { getListDashcard } from "./card";
import { api } from ".";
jest.mock(".", () => ({ api: { get: jest.fn() } }));
const get = api.get as jest.Mock;
beforeEach(() => { get.mockReset(); get.mockResolvedValue({ data: { data: { items: [] } } }); });
it("keeps preview requests unchanged", async () => {
  await getListDashcard("ws-1", "dash-1", 10);
  expect(get).toHaveBeenCalledWith("/card/dash-1/list-dashcard/ws-1", { params: { limit: 10 } });
});
it("requests complete descriptions for report exports", async () => {
  await getListDashcard("ws-1", "dash-1", undefined, true);
  expect(get).toHaveBeenCalledWith("/card/dash-1/list-dashcard/ws-1", { params: { include_descriptions: "true" } });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { getListDashcard } from "@api/card";
import { useDashcardList } from "./dashcard-list";

jest.mock("@api/card", () => ({ getListDashcard: jest.fn() }));
jest.mock("next/navigation", () => ({ useParams: () => ({ workspaceId: "ws-1" }) }));
const mockSetItems = jest.fn();
const mockSetConfig = jest.fn();
jest.mock("@providers/card-detail-context", () => ({
  useCardDetailContext: () => ({ setItemDashcard: mockSetItems, setDashcardConfig: mockSetConfig }),
}));

it("fetches report notes separately from a fresh preview cache", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const preview = { data: { items: [{ id: "card-1", description: "[has_content]" }] } };
  const report = { data: { items: [{ id: "card-1", description: "KIRIM PUSAT TGL 21" }] } };
  const fetchList = getListDashcard as jest.Mock;
  fetchList.mockResolvedValueOnce(preview).mockResolvedValueOnce(report);
  const { result, rerender, unmount } = renderHook(
    ({ full }) => useDashcardList({ id: "dash-1" } as any, { syncContext: full, includeDescriptions: full }),
    { wrapper, initialProps: { full: false } }
  );
  await waitFor(() => expect(result.current.resultData).toEqual(preview.data));
  expect(fetchList).toHaveBeenLastCalledWith("ws-1", "dash-1", undefined, false);
  rerender({ full: true });
  await waitFor(() => expect(result.current.resultData).toEqual(report.data));
  expect(fetchList).toHaveBeenLastCalledWith("ws-1", "dash-1", undefined, true);
  expect(mockSetItems).toHaveBeenLastCalledWith(report.data.items);
  rerender({ full: false });
  await waitFor(() => expect(result.current.resultData).toEqual(preview.data));
  expect(fetchList).toHaveBeenCalledTimes(2);
  unmount(); client.clear();
});

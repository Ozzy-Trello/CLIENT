import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { getNotulensiList } from "@api/notulensi";
import { useNotulensiList } from "./notulensi";

jest.mock("@api/notulensi", () => ({
  getNotulensiList: jest.fn(),
}));

const mockedGetList = getNotulensiList as jest.MockedFunction<typeof getNotulensiList>;

const makeWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const page = (title: string) => ({
  data: [{ id: "1", title }],
  statusCounts: {},
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
}) as any;

describe("useNotulensiList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the previous results while a new search is loading", async () => {
    // Filters are part of the query key, so without placeholderData every
    // keystroke lands on an empty cache entry and the list blanks out.
    let resolveSecond: (value: unknown) => void = () => undefined;
    mockedGetList
      .mockResolvedValueOnce(page("first"))
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveSecond = resolve; }) as any,
      );

    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(
      ({ search }: { search: string }) =>
        useNotulensiList("ws-1", { scope: "related", page: 1, limit: 20, search }),
      { wrapper, initialProps: { search: "" } },
    );

    await waitFor(() => expect(result.current.data?.data[0].title).toBe("first"));

    rerender({ search: "abc" });

    // New query key, request still in flight: previous rows must survive.
    expect(result.current.data?.data[0].title).toBe("first");
    expect(result.current.isFetching).toBe(true);

    resolveSecond(page("second"));
    await waitFor(() => expect(result.current.data?.data[0].title).toBe("second"));
  });

  it("does not fetch until it is enabled", () => {
    renderHook(
      () => useNotulensiList("ws-1", { scope: "related", page: 1, limit: 20 }, false),
      { wrapper: makeWrapper() },
    );

    expect(mockedGetList).not.toHaveBeenCalled();
  });
});

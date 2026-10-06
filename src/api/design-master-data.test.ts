import { TextDecoder, TextEncoder } from "util";

// jsdom ships neither encoder; the SSE reader needs both.
(global as any).TextDecoder = TextDecoder;
(global as any).TextEncoder = TextEncoder;

const fetchMock = jest.fn();
const readerFrom = (chunks: string[]) => {
  let index = 0;
  return {
    read: jest.fn(async () => {
      if (index >= chunks.length) return { done: true, value: undefined };
      const value = new TextEncoder().encode(chunks[index]);
      index += 1;
      return { done: false, value };
    }),
  };
};

const sseResponse = (chunks: string[]) =>
  ({
    ok: true,
    headers: { get: () => "text/event-stream" },
    body: { getReader: () => readerFrom(chunks) },
  }) as any;

describe("uploadDesignTypeImageZip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.resetModules();
  });

  it("reports progress events and returns the final result", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: progress\ndata: {"done":0,"total":12}\n\n',
        'event: progress\ndata: {"done":4,"total":12}\n\n',
        'event: progress\ndata: {"done":12,"total":12}\n\n',
        'event: done\ndata: {"success":true,"data":{"total_attempted":12,"total_matched":12,"total_updated":12,"total_skipped":0,"collection_code":"lib","collar_variant":"","errors":[]}}\n\n',
      ]),
    );

    const { uploadDesignTypeImageZip } = await import("./design-master-data");
    const onProgress = jest.fn();
    const file = new File(["zip"], "library.zip");

    const result = await uploadDesignTypeImageZip(file, onProgress);

    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { done: 0, total: 12 },
      { done: 4, total: 12 },
      { done: 12, total: 12 },
    ]);
    expect(result.total_updated).toBe(12);
  });

  it("handles events split across chunk boundaries", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: progress\ndata: {"done":0,',
        '"total":5}\n\nevent: done\ndata: {"success":true,"data":{"total_updated":5}}\n\n',
      ]),
    );

    const { uploadDesignTypeImageZip } = await import("./design-master-data");
    const onProgress = jest.fn();

    const result = await uploadDesignTypeImageZip(
      new File(["zip"], "library.zip"),
      onProgress,
    );

    expect(onProgress).toHaveBeenCalledWith({ done: 0, total: 5 });
    expect(result.total_updated).toBe(5);
  });

  it("falls back to the plain JSON response when streaming is not offered", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ success: true, data: { total_updated: 3 } }),
    });

    const { uploadDesignTypeImageZip } = await import("./design-master-data");
    const onProgress = jest.fn();

    const result = await uploadDesignTypeImageZip(
      new File(["zip"], "library.zip"),
      onProgress,
    );

    expect(result.total_updated).toBe(3);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("surfaces a streamed error event", async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['event: error\ndata: {"message":"Internal server error"}\n\n']),
    );

    const { uploadDesignTypeImageZip } = await import("./design-master-data");

    await expect(
      uploadDesignTypeImageZip(new File(["zip"], "library.zip")),
    ).rejects.toThrow("Internal server error");
  });

  it("fails clearly when the stream ends without a result", async () => {
    fetchMock.mockResolvedValue(sseResponse(["event: progress\ndata: {\"done\":1,\"total\":2}\n\n"]));

    const { uploadDesignTypeImageZip } = await import("./design-master-data");

    await expect(
      uploadDesignTypeImageZip(new File(["zip"], "library.zip")),
    ).rejects.toThrow("without a result");
  });
});
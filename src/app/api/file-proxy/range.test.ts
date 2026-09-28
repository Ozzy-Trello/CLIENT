/**
 * @jest-environment node
 */
import { proxyFileByUrl } from "./lib";

const TARGET = "https://files.example.com/big.pdf";

const makeRequest = (headers: Record<string, string> = {}) =>
  ({
    url: "https://app.example.com/api/file-proxy?url=" + encodeURIComponent(TARGET),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  }) as any;

describe("file proxy range support", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("forwards the Range header upstream", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response("partial", {
        status: 206,
        headers: {
          "content-type": "application/pdf",
          "content-range": "bytes 0-65535/101929859",
          "accept-ranges": "bytes",
        },
      })
    );
    global.fetch = fetchMock as any;

    await proxyFileByUrl(makeRequest({ range: "bytes=0-65535" }), TARGET, true);

    const sentHeaders = fetchMock.mock.calls[0][1].headers;
    expect(sentHeaders.range).toBe("bytes=0-65535");
  });

  it("passes range metadata back so pdf.js can fetch partially", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response("partial", {
        status: 206,
        headers: {
          "content-type": "application/pdf",
          "content-range": "bytes 0-65535/101929859",
          "accept-ranges": "bytes",
          "content-length": "65536",
        },
      })
    ) as any;

    const res = await proxyFileByUrl(
      makeRequest({ range: "bytes=0-65535" }),
      TARGET,
      true
    );

    expect(res.status).toBe(206);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-range")).toBe("bytes 0-65535/101929859");
  });

  it("still works for plain requests without a Range header", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response("whole", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      })
    );
    global.fetch = fetchMock as any;

    const res = await proxyFileByUrl(makeRequest(), TARGET, true);

    expect(fetchMock.mock.calls[0][1].headers.range).toBeUndefined();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toBe("inline");
  });
});

import { runVersionGate } from "./version-gate";

describe("app version reset with unsent Daily Activity text", () => {
  const draftKey = "ozzy_daily_activity_draft_v1:user-1:2026-11-25";
  const original = process.env.NEXT_PUBLIC_APP_VERSION;

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    process.env.NEXT_PUBLIC_APP_VERSION = "new-version";
    sessionStorage.setItem(draftKey, '{"activities":["Unsent work"]}');
    sessionStorage.setItem("accessToken", "old-token");
    localStorage.setItem("accessToken", "old-token");
    localStorage.setItem("persist:root", "old-cache");
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
    else process.env.NEXT_PUBLIC_APP_VERSION = original;
  });

  it("preserves draft text while clearing authentication and stale caches on an update", () => {
    localStorage.setItem("__ozzy_app_version", "old-version");
    sessionStorage.setItem("old-cache", "discard");
    runVersionGate();
    expect(sessionStorage.getItem(draftKey)).toContain("Unsent work");
    expect(sessionStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("old-cache")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("persist:root")).toBeNull();
    expect(localStorage.getItem("__ozzy_app_version")).toBe("new-version");
  });

  it("keeps recovery when the version marker is missing", () => {
    runVersionGate();
    expect(sessionStorage.getItem(draftKey)).toContain("Unsent work");
    expect(sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("does not reset a session already on the current version", () => {
    localStorage.setItem("__ozzy_app_version", "new-version");
    runVersionGate();
    expect(sessionStorage.getItem("accessToken")).toBe("old-token");
    expect(sessionStorage.getItem(draftKey)).toContain("Unsent work");
  });

  it("does not clear storage when no app version is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    runVersionGate();
    expect(localStorage.getItem("accessToken")).toBe("old-token");
  });

  it("does not crash if browser storage is inaccessible", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    expect(() => runVersionGate()).not.toThrow();
  });
});

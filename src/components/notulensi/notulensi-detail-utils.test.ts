import {
  NOTULENSI_ACTION_META,
  NOTULENSI_PROGRESS_OPTIONS,
  copyNotulensiLink,
  formatNotulensiListDate,
  getListWorkflowActions,
  getAssigneeNames,
  getCommentQuote,
  getPastedFiles,
  getRichTextPlainText,
  getNotulensiUrl,
  hasDisplayableRichContent,
  hasRichTextContent,
  isNotulensiContentValid,
  linkifyNotulensiComment,
  normalizeOptionalRichText,
  removeQueuedInlineImages,
  replaceInlineImageUrls,
  validateNotulensiAttachments,
  uploadNotulensiAttachmentsSequentially,
} from "./notulensi-detail-utils";
import { NOTULENSI_STATUS_META, NOTULENSI_STATUS_ORDER } from "./notulensi-status";

describe("notulensi detail options", () => {
  it("normalizes missing optional content to an empty string", () => {
    expect(normalizeOptionalRichText()).toBe("");
    expect(normalizeOptionalRichText("<p>Detail</p>")).toBe("<p>Detail</p>");
  });

  it("requires visible comment text, a mention, or an image", () => {
    expect(hasRichTextContent("<p><br></p>")).toBe(false);
    expect(hasRichTextContent("<p>&nbsp;\u200b</p>")).toBe(false);
    expect(hasRichTextContent("<p>Looks good</p>")).toBe(true);
    expect(
      hasRichTextContent('<p><span class="mention" data-id="u-1">@alice</span></p>')
    ).toBe(true);
    expect(hasRichTextContent('<p><img src="https://files.test/image.png"></p>')).toBe(true);
    expect(hasRichTextContent("<p><img></p>")).toBe(false);
    expect(hasDisplayableRichContent('<p><img src="image.png"></p>')).toBe(true);
  });

  it("validates content by visible text instead of raw HTML size", () => {
    expect(getRichTextPlainText(`<p>${"a".repeat(100000)}</p>`)).toHaveLength(100000);
    expect(isNotulensiContentValid(`<p>${"a".repeat(100000)}</p>`)).toBe(true);
    expect(isNotulensiContentValid(`<p>${"a".repeat(100001)}</p>`)).toBe(false);
    expect(isNotulensiContentValid(`<span class="${"x".repeat(100001)}">ok</span>`)).toBe(true);
  });

  it("removes unresolved inline images and replaces uploaded placeholders", () => {
    const file = new File(["image"], "image.png", { type: "image/png" });
    const html = '<p>Before<img src="blob:queued-1">After<img src="https://existing.test/image.png"></p>';
    expect(removeQueuedInlineImages(html, [{ file, placeholderUrl: "blob:queued-1" }])).toBe(
      '<p>BeforeAfter<img src="https://existing.test/image.png"></p>'
    );
    expect(replaceInlineImageUrls(html, new Map([["blob:queued-1", "https://files.test/image.png"]]))).toContain(
      'src="https://files.test/image.png"'
    );
  });

  it("extracts pasted files without intercepting text-only clipboard data", () => {
    const file = new File(["x"], "notes.txt");
    expect(getPastedFiles({ files: [file] as unknown as FileList, items: [] as unknown as DataTransferItemList })).toEqual([file]);
    expect(getPastedFiles({ files: [] as unknown as FileList, items: [] as unknown as DataTransferItemList })).toEqual([]);
  });

  it("builds bounded plain-text reply quotes and safely linkifies comments", () => {
    expect(getCommentQuote(`<p>${"a".repeat(200)}</p>`)).toHaveLength(180);
    const html = linkifyNotulensiComment('<p>See https://example.com and <a href="https://linked.test">linked</a></p>');
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll("a")).toHaveLength(2);
    doc.querySelectorAll("a").forEach((anchor) => {
      expect(anchor.target).toBe("_blank");
      expect(anchor.rel).toBe("noopener noreferrer");
    });
  });

  it("formats assignee names including empty and deleted users", () => {
    expect(getAssigneeNames([])).toBe("Unassigned");
    expect(getAssigneeNames([
      { id: "a-1", userId: "u-1", user: { id: "u-1", username: "alice", email: "a@test" } },
      { id: "a-2", userId: "u-2", user: { id: "u-2", username: "bob", email: "b@test", role: { id: "r-1", name: "Manager" } } },
      { id: "a-3", userId: "u-3", user: null },
    ])).toBe("alice, bob (Manager), Unknown user");
  });

  it("formats home dates without time", () => {
    expect(formatNotulensiListDate("2026-08-07")).toBe("07/08/2026");
  });

  it("uses Revisi for the revision action", () => {
    expect(NOTULENSI_ACTION_META.request_revision.label).toBe("Revisi");
  });

  it("labels only the review submission action as Ajukan Review", () => {
    expect(NOTULENSI_ACTION_META.submit_review.label).toBe("Ajukan Review");
    expect(NOTULENSI_STATUS_META.waiting_review.label).toBe("Menunggu Review");
  });

  it("selects every list workflow action except progress updates", () => {
    expect(
      getListWorkflowActions([
        "start",
        "submit_review",
        "request_revision",
        "complete",
        "undo_complete",
        "cancel",
        "update_progress",
      ])
    ).toEqual([
      "start",
      "submit_review",
      "request_revision",
      "complete",
      "undo_complete",
      "cancel",
    ]);
    expect(getListWorkflowActions()).toEqual([]);
  });

  it("orders status filters by workflow display order", () => {
    expect(NOTULENSI_STATUS_ORDER).toEqual([
      "new",
      "in_progress",
      "revision",
      "waiting_review",
      "completed",
      "cancelled",
    ]);
  });

  it("uses the current status labels and icons", () => {
    expect(NOTULENSI_STATUS_META.new.label).toBe("New Task");
    expect(NOTULENSI_STATUS_META.cancelled.label).toBe("Canceled");
    expect(NOTULENSI_STATUS_ORDER.every((status) => Boolean(NOTULENSI_STATUS_META[status].icon))).toBe(true);
  });

  it("builds and copies the authenticated canonical link", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);

    expect(getNotulensiUrl("https://ozzy.test", "ws-1", "n-1")).toBe(
      "https://ozzy.test/workspace/ws-1/notulensi/n-1"
    );
    await copyNotulensiLink("ws-1", "n-1", "https://ozzy.test", { writeText });

    expect(writeText).toHaveBeenCalledWith(
      "https://ozzy.test/workspace/ws-1/notulensi/n-1"
    );
  });

  it("falls back to DOM copy when the Clipboard API is unavailable", async () => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });

    await copyNotulensiLink("ws-1", "n-1", "https://ozzy.test", undefined);

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("defines the Undone action confirmation", () => {
    expect(NOTULENSI_ACTION_META.undo_complete).toEqual({
      label: "Undone",
      confirmation: {
        title: "Undone task ini?",
        description: "Task kembali ke status sebelum Completed.",
      },
    });
  });

  it("offers every supported progress value", () => {
    expect(NOTULENSI_PROGRESS_OPTIONS).toEqual([
      { label: "0%", value: 0 },
      { label: "25%", value: 25 },
      { label: "50%", value: 50 },
      { label: "75%", value: 75 },
      { label: "100%", value: 100 },
    ]);
  });

  it("rejects only attachments larger than 50 MB", () => {
    const valid = new File(["valid"], "valid.pdf");
    const oversized = new File(["large"], "large.pdf");
    Object.defineProperty(valid, "size", { value: 50 * 1024 * 1024 });
    Object.defineProperty(oversized, "size", { value: 50 * 1024 * 1024 + 1 });

    expect(validateNotulensiAttachments([valid, oversized])).toEqual({
      accepted: [valid],
      rejected: [oversized],
    });
  });

  it("uploads sequentially and continues after failure", async () => {
    const files = [new File(["a"], "a.txt"), new File(["b"], "b.txt"), new File(["c"], "c.txt")];
    const active: string[] = [];
    const order: string[] = [];
    const progress: string[] = [];

    const result = await uploadNotulensiAttachmentsSequentially(
      files,
      async (file) => {
        active.push(file.name);
        expect(active).toHaveLength(1);
        order.push(file.name);
        active.pop();
        if (file.name === "b.txt") throw new Error("upload failed");
      },
      (current, total) => progress.push(`${current} of ${total}`)
    );

    expect(order).toEqual(["a.txt", "b.txt", "c.txt"]);
    expect(progress).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
    expect(result).toEqual({ uploaded: 2, failed: 1 });
  });
});

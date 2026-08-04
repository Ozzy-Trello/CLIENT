import {
  NOTULENSI_ACTION_META,
  NOTULENSI_PROGRESS_OPTIONS,
  copyNotulensiLink,
  getListWorkflowActions,
  getAssigneeNames,
  getNotulensiUrl,
  hasDisplayableRichContent,
  hasRichTextContent,
  normalizeOptionalRichText,
  validateNotulensiAttachments,
  uploadNotulensiAttachmentsSequentially,
} from "./notulensi-detail-utils";

describe("notulensi detail options", () => {
  it("normalizes missing optional content to an empty string", () => {
    expect(normalizeOptionalRichText()).toBe("");
    expect(normalizeOptionalRichText("<p>Detail</p>")).toBe("<p>Detail</p>");
  });

  it("requires visible comment text or a mention", () => {
    expect(hasRichTextContent("<p><br></p>")).toBe(false);
    expect(hasRichTextContent("<p>&nbsp;\u200b</p>")).toBe(false);
    expect(hasRichTextContent("<p>Looks good</p>")).toBe(true);
    expect(
      hasRichTextContent('<p><span class="mention" data-id="u-1">@alice</span></p>')
    ).toBe(true);
    expect(hasRichTextContent('<p><img src="image.png"></p>')).toBe(false);
    expect(hasDisplayableRichContent('<p><img src="image.png"></p>')).toBe(true);
  });

  it("formats assignee names including empty and deleted users", () => {
    expect(getAssigneeNames([])).toBe("Unassigned");
    expect(getAssigneeNames([
      { id: "a-1", userId: "u-1", user: { id: "u-1", username: "alice", email: "a@test" } },
      { id: "a-2", userId: "u-2", user: null },
    ])).toBe("alice, Unknown user");
  });

  it("uses Revisi for the revision action", () => {
    expect(NOTULENSI_ACTION_META.request_revision.label).toBe("Revisi");
  });

  it("selects only list workflow actions", () => {
    expect(
      getListWorkflowActions(["start", "request_revision", "complete", "cancel", "update_progress"])
    ).toEqual(["request_revision", "complete", "cancel"]);
    expect(getListWorkflowActions()).toEqual([]);
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

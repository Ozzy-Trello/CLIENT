import { getImageFile, sanitizeEditorImageUrl, toCssSize } from "./index";
import { buildMentionSuggestions } from "./mentions";

describe("rich text editor sizing", () => {
  it("preserves CSS sizes and converts numeric sizes to pixels", () => {
    expect(toCssSize(220)).toBe("220px");
    expect(toCssSize("14rem")).toBe("14rem");
  });
});

describe("rich text editor image files", () => {
  it("accepts images from drag and drop but ignores other files", () => {
    const image = new File(["image"], "photo.png", { type: "image/png" });
    const pdf = new File(["pdf"], "document.pdf", { type: "application/pdf" });

    expect(getImageFile({ files: [pdf, image] as any, items: [] as any })).toBe(image);
    expect(getImageFile({ files: [pdf] as any, items: [] as any })).toBeNull();
  });

  it("allows local previews and safe persisted image URLs", () => {
    expect(sanitizeEditorImageUrl("blob:https://ozzy.test/preview")).toBe(
      "blob:https://ozzy.test/preview"
    );
    expect(sanitizeEditorImageUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc"
    );
    expect(sanitizeEditorImageUrl("https://files.test/photo.png")).toBe(
      "https://files.test/photo.png"
    );
    expect(sanitizeEditorImageUrl("javascript:alert(1)")).toBe("//:0");
  });
});

describe("rich text editor supplied mentions", () => {
  const users = [
    { id: "u-1", username: "alice" },
    { id: "u-2", username: "bob", name: "Bob Smith" },
  ];

  it("filters supplied users and preserves their IDs", () => {
    expect(buildMentionSuggestions(users, "smith", false)).toEqual([
      { id: "u-2", value: "Bob Smith" },
    ]);
  });

  it("includes workspace all only when allowed", () => {
    expect(buildMentionSuggestions(users, "", true)[0]).toEqual({
      id: "__workspace_all__",
      value: "all",
    });
    expect(buildMentionSuggestions(users, "", false)).toHaveLength(2);
  });
});

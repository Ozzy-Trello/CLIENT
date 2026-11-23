import { mergeCardDescription, mergeCardListDescriptions } from "./card-description";

describe("mergeCardDescription", () => {
  it("keeps a known description when a list or event has no description information", () => {
    expect(mergeCardDescription("<p>Saved</p>", "[has_content]")).toBe("<p>Saved</p>");
    expect(mergeCardDescription("<p>Saved</p>", undefined)).toBe("<p>Saved</p>");
    expect(mergeCardDescription("<p>Saved</p>", "")).toBe("<p>Saved</p>");
  });

  it("accepts real incoming HTML", () => {
    expect(mergeCardDescription("<p>Old</p>", "<p>New</p>")).toBe("<p>New</p>");
  });

  it("preserves description across list refreshes with placeholder, absent, or empty values", () => {
    const previous: { id: string; description?: string }[] = [{ id: "1", description: "<p>Saved</p>" }];
    expect(mergeCardListDescriptions(previous, [{ id: "1", description: "[has_content]" }])[0].description).toBe("<p>Saved</p>");
    expect(mergeCardListDescriptions(previous, [{ id: "1" }])[0].description).toBe("<p>Saved</p>");
    expect(mergeCardListDescriptions(previous, [{ id: "1", description: "" }])[0].description).toBe("<p>Saved</p>");
  });
});

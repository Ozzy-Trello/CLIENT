import { toCssSize } from "./index";
import { buildMentionSuggestions } from "./mentions";

describe("rich text editor sizing", () => {
  it("preserves CSS sizes and converts numeric sizes to pixels", () => {
    expect(toCssSize(220)).toBe("220px");
    expect(toCssSize("14rem")).toBe("14rem");
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

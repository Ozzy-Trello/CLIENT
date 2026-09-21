/**
 * The sablon/stitch modals prefill their rows in a useEffect. That effect used
 * to depend on the attachment array, which is a new object on every render, so
 * after a ZIP upload it re-ran forever and the table spinner never settled.
 *
 * The fix is to depend on the joined id string instead. This pins the property
 * that makes the fix correct: the key only changes when the ids change.
 */
const keyOf = (attachments: { id: string }[]) =>
  attachments.map((att) => att.id).join("|");

describe("attachment ids key", () => {
  it("is stable across renders when the ids are unchanged", () => {
    const render1 = [{ id: "a" }, { id: "b" }];
    const render2 = [{ id: "a" }, { id: "b" }];

    // The arrays are different objects, which is exactly why the old dependency
    // re-ran the effect on every render.
    expect(render1).not.toBe(render2);
    expect(keyOf(render1)).toBe(keyOf(render2));
  });

  it("changes when an upload adds an attachment", () => {
    const before = [{ id: "a" }];
    const after = [{ id: "a" }, { id: "b" }];

    expect(keyOf(before)).not.toBe(keyOf(after));
  });

  it("changes when an attachment is removed", () => {
    expect(keyOf([{ id: "a" }, { id: "b" }])).not.toBe(keyOf([{ id: "a" }]));
  });

  it("distinguishes order, so a reorder still refreshes the rows", () => {
    expect(keyOf([{ id: "a" }, { id: "b" }])).not.toBe(
      keyOf([{ id: "b" }, { id: "a" }])
    );
  });

  it("handles the empty list", () => {
    expect(keyOf([])).toBe("");
  });
});

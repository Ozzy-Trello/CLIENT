import { act, renderHook } from "@testing-library/react";
import { useNotulensiPrivateNoteDraft } from "./notulensi-private-note-draft";

describe("private note drafts", () => {
  it("keeps typing when a delayed load or refetch returns", () => {
    const { result, rerender } = renderHook(
      ({ key, content }) => useNotulensiPrivateNoteDraft(key, content),
      { initialProps: { key: "task-1", content: "" } }
    );
    act(() => result.current.setValue("my unsaved note"));
    rerender({ key: "task-1", content: "previously saved note" });
    expect(result.current.value).toBe("my unsaved note");
    act(() => result.current.reset());
    expect(result.current.value).toBe("previously saved note");
  });

  it("shows fetched content until editing and clears drafts between records", () => {
    const { result, rerender } = renderHook(
      ({ key, content }) => useNotulensiPrivateNoteDraft(key, content),
      { initialProps: { key: "task-1", content: "" } }
    );
    rerender({ key: "task-1", content: "saved note" });
    expect(result.current.value).toBe("saved note");
    act(() => result.current.setValue("unsaved"));
    rerender({ key: "task-2", content: "other note" });
    expect(result.current.value).toBe("other note");
    rerender({ key: "task-1", content: "saved note" });
    expect(result.current.value).toBe("saved note");
  });
});

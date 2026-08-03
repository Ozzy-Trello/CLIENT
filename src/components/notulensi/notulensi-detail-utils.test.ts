import {
  NOTULENSI_ACTION_META,
  NOTULENSI_PROGRESS_OPTIONS,
} from "./notulensi-detail-utils";

describe("notulensi detail options", () => {
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
});

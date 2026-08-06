import { convertValueToText } from "./util";

describe("convertValueToText", () => {
  it("formats relative date values independently of their type", () => {
    expect(
      convertValueToText({
        type: "later_than",
        number: 3,
        unit: "day",
        reference: "from_now",
      })
    ).toBe("3 days from now");
    expect(
      convertValueToText({
        type: "relative",
        number: 1,
        unit: "weeks",
        reference: "ago",
      })
    ).toBe("1 week ago");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import NotulensiFilters from "./notulensi-filters";

jest.mock("@hooks/notulensi", () => ({
  useNotulensiEligibleAssignees: () => ({ data: { data: [] }, isLoading: false }),
}));

jest.mock("@hooks/useDebouncedCallback", () => ({
  useDebouncedCallback: (callback: (...args: any[]) => void) => callback,
}));

jest.mock("antd", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  DatePicker: { RangePicker: () => null },
  Grid: { useBreakpoint: () => ({ lg: true }) },
  Input: { Search: () => null },
  Select: ({ mode, value }: any) => <div data-testid="select" data-mode={mode || "single"} data-value={JSON.stringify(value)} />,
}));

describe("Notulensi scope filter", () => {
  it("uses a single All Related value and restores it when filters are cleared", () => {
    const onChange = jest.fn();
    render(<NotulensiFilters value={{ scope: "related", page: 2, limit: 20 }} onChange={onChange} workspaceId="workspace-1" />);

    const selects = screen.getAllByTestId("select");
    expect(selects[selects.length - 1].getAttribute("data-mode")).toBe("single");
    expect(selects[selects.length - 1].getAttribute("data-value")).toBe('"related"');

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenCalledWith({ scope: "related", page: 1, limit: 20 });
  });
});

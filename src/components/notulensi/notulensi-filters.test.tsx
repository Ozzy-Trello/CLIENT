import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotulensiFilters from "./notulensi-filters";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

jest.mock("@hooks/notulensi", () => ({
  useNotulensiEligibleAssignees: () => ({
    data: { data: [{ id: "user-1", username: "Ayu", email: "ayu@example.com", role: { id: "role-1", name: "Supervisor" } }] },
    isLoading: false,
  }),
  useNotulensiDivisions: () => ({
    data: { data: [{ id: "division-1", name: "Outlet", roles: [{ id: "role-1", name: "Supervisor" }] }] },
    isLoading: false,
    isSuccess: true,
  }),
}));

describe("NotulensiFilters", () => {
  it("applies selected divisions to List filters", async () => {
    const onChange = jest.fn();
    render(
      <NotulensiFilters
        value={{ scope: "related", page: 1, limit: 20 }}
        onChange={onChange}
        workspaceId="workspace-1"
      />
    );

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Filter divisi" }));
    await waitFor(() => expect(screen.getByText("Outlet")).not.toBeNull());
    fireEvent.click(screen.getByText("Outlet"));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ divisionIds: ["division-1"], page: 1 })
      )
    );
  });
});

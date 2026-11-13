import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotulensiDivisionsPage from "./page";

jest.mock("antd", () => {
  const actual = jest.requireActual("antd");
  return {
    ...actual,
    Table: () => <div data-testid="division-table" />,
  };
});

const mockCreateMutation = { mutateAsync: jest.fn(), isPending: false };
const mockUpdateMutation = { mutateAsync: jest.fn(), isPending: false };
const mockDeleteMutation = { mutateAsync: jest.fn(), isPending: false };

jest.mock("@hooks/notulensi", () => ({
  useCreateNotulensiDivision: () => mockCreateMutation,
  useDeleteNotulensiDivision: () => mockDeleteMutation,
  useUpdateNotulensiDivision: () => mockUpdateMutation,
  useNotulensiDivisions: () => ({ data: { data: [] }, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock("@hooks/account", () => ({
  useCurrentAccount: () => ({ data: { data: { role: { name: "Super Admin" } } }, isLoading: false }),
}));
jest.mock("@hooks/board", () => ({
  useAllRoles: () => ({ data: { data: [{ id: "role-1", name: "Supervisor" }] }, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock("next/navigation", () => ({ useParams: () => ({ workspaceId: "workspace-1" }) }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

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

describe("NotulensiDivisionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMutation.mutateAsync.mockResolvedValue({ data: { id: "division-1" } });
  });

  it("creates a division with selected roles", async () => {
    render(<NotulensiDivisionsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Tambah Divisi" }));
    fireEvent.change(screen.getByLabelText("Nama Divisi"), { target: { value: "Outlet" } });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Jabatan" }));
    await waitFor(() => expect(screen.getByText("Supervisor")).not.toBeNull());
    fireEvent.click(screen.getByText("Supervisor"));
    fireEvent.click(screen.getByRole("button", { name: "Tambah" }));

    await waitFor(() =>
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        payload: { name: "Outlet", roleIds: ["role-1"] },
      })
    );
  });
});

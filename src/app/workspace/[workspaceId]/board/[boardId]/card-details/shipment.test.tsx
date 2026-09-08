import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Shipment from "./shipment";

const mockUseCardShipment = jest.fn();
const mockUseBoardPermissionsContext = jest.fn();

jest.mock("@hooks/card_shipment", () => ({
  useCardShipment: (...args: unknown[]) => mockUseCardShipment(...args),
}));

jest.mock("@providers/board-permissions-context", () => ({
  useBoardPermissionsContext: () => mockUseBoardPermissionsContext(),
}));

jest.mock("antd", () => ({
  Button: ({ children, danger, loading, type, ...props }: any) => (
    <button {...props}>{loading ? "Loading" : children}</button>
  ),
  Input: ({ onChange, onPressEnter, ...props }: any) => (
    <input
      {...props}
      onChange={onChange}
      onKeyDown={(event) => event.key === "Enter" && onPressEnter?.(event)}
    />
  ),
  Popconfirm: ({ children }: any) => children,
  Select: ({
    options,
    onChange,
    value,
    optionFilterProp,
    showSearch,
    ...props
  }: any) => (
    <select
      {...props}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Pilih ekspedisi</option>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Spin: () => <div>Loading</div>,
  message: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

const saveShipment = jest.fn();

const ekspedisiField = {
  id: "field-ekspedisi",
  name: "Ekspedisi",
  options: [
    { value: "jne_reg", label: "JNE Regular" },
    { value: "sicepat_best", label: "SiCepat BEST" },
  ],
};

describe("Shipment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBoardPermissionsContext.mockReturnValue({
      canUpdateCard: () => true,
      canManageCardCustomFields: () => true,
    });
    mockUseCardShipment.mockReturnValue({
      shipment: null,
      isLoading: false,
      saveShipment,
      deleteShipment: jest.fn(),
      isSaving: false,
      isDeleting: false,
    });
  });

  it("sources choices from the Ekspedisi custom field", () => {
    render(
      <Shipment
        cardId="card-1"
        workspaceId="workspace-1"
        cardCustomFields={[ekspedisiField] as any}
      />,
    );

    expect(
      (screen.getByRole("option", { name: "JNE Regular" }) as HTMLOptionElement)
        .value,
    ).toBe("jne_reg");
    expect(
      (screen.getByRole("option", {
        name: "SiCepat BEST",
      }) as HTMLOptionElement).value,
    ).toBe("sicepat_best");
  });

  it("prefills an existing shipment and displays its mapped courier codes", async () => {
    mockUseCardShipment.mockReturnValue({
      shipment: {
        id: "shipment-1",
        updated_at: "2026-09-08T00:00:00.000Z",
        ekspedisi_option_value: "jne_reg",
        waybill_id: "WAYBILL-123",
        courier_code: "jne",
        courier_service_code: "reg",
      },
      isLoading: false,
      saveShipment,
      deleteShipment: jest.fn(),
      isSaving: false,
      isDeleting: false,
    });

    render(
      <Shipment
        cardId="card-1"
        workspaceId="workspace-1"
        cardCustomFields={[ekspedisiField] as any}
      />,
    );

    await waitFor(() => {
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        "jne_reg",
      );
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
        "WAYBILL-123",
      );
    });
    expect(screen.getByText("jne / reg")).not.toBeNull();
  });

  it("shows a message when the saved shipment is unsupported", () => {
    mockUseCardShipment.mockReturnValue({
      shipment: {
        id: "shipment-1",
        updated_at: "2026-09-08T00:00:00.000Z",
        ekspedisi_option_value: "jne_reg",
        waybill_id: "WAYBILL-123",
        courier_code: null,
        courier_service_code: null,
      },
      isLoading: false,
      saveShipment,
      deleteShipment: jest.fn(),
      isSaving: false,
      isDeleting: false,
    });

    render(
      <Shipment
        cardId="card-1"
        workspaceId="workspace-1"
        cardCustomFields={[ekspedisiField] as any}
      />,
    );

    expect(
      screen.getByText("Ekspedisi belum didukung Biteship"),
    ).not.toBeNull();
  });

  it("saves the selected option with a trimmed waybill", async () => {
    saveShipment.mockResolvedValue(undefined);
    render(
      <Shipment
        cardId="card-1"
        workspaceId="workspace-1"
        cardCustomFields={[ekspedisiField] as any}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "sicepat_best" },
    });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  WB-456  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() =>
      expect(saveShipment).toHaveBeenCalledWith({
        waybill_id: "WB-456",
        ekspedisi_option_value: "sicepat_best",
      }),
    );
  });

  it("disables shipment controls without edit permission", () => {
    mockUseBoardPermissionsContext.mockReturnValue({
      canUpdateCard: () => false,
      canManageCardCustomFields: () => true,
    });

    render(
      <Shipment
        cardId="card-1"
        workspaceId="workspace-1"
        cardCustomFields={[ekspedisiField] as any}
      />,
    );

    expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

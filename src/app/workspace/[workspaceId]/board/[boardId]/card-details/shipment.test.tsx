import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Shipment from "./shipment";

const mockUseCardShipment = jest.fn();
const mockUseCardAttachment = jest.fn();
const mockUseBoardPermissionsContext = jest.fn();
const mockUploadFile = jest.fn();
const mockModalConfirm = jest.fn();
const mockCreateObjectURL = jest.fn(() => "blob:receipt-preview");
const mockRevokeObjectURL = jest.fn();

jest.mock("lucide-react", () => ({
  FileImage: () => <span aria-hidden="true" />,
  RefreshCw: () => <span aria-hidden="true" />,
  Trash2: () => <span aria-hidden="true" />,
  Upload: () => <span aria-hidden="true" />,
}));

jest.mock("@hooks/card_shipment", () => ({
  useCardShipment: (...args: unknown[]) => mockUseCardShipment(...args),
}));

jest.mock("@hooks/card_attachment", () => ({
  useCardAttachment: (...args: unknown[]) => mockUseCardAttachment(...args),
}));

jest.mock("@api/file", () => ({
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
}));

jest.mock("@utils/file-url", () => ({
  toDirectFileUrl: (value?: string) => value || "",
}));

jest.mock("@providers/board-permissions-context", () => ({
  useBoardPermissionsContext: () => mockUseBoardPermissionsContext(),
}));

jest.mock("antd", () => {
  const Modal = ({ open, title, children, footer }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <div>{title}</div>
        {children}
        <div>{footer}</div>
      </div>
    ) : null;
  Modal.confirm = (options: any) => mockModalConfirm(options);

  return {
    Button: ({ children, danger, loading, type, icon, ...props }: any) => (
      <button type="button" {...props}>
        {icon}
        {loading ? "Loading" : children}
      </button>
    ),
    Input: ({ onChange, onPressEnter, ...props }: any) => (
      <input
        {...props}
        onChange={onChange}
        onKeyDown={(event) => event.key === "Enter" && onPressEnter?.(event)}
      />
    ),
    Modal,
    Select: ({
      options = [],
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
    Spin: () => <div>Loading data</div>,
    message: {
      error: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

const mockSaveShipment = jest.fn();
const mockDeleteShipment = jest.fn();
const mockAddAttachmentAsync = jest.fn();
const mockDeleteAttachmentAsync = jest.fn();
const mockOnClose = jest.fn();

const ekspedisiField = {
  id: "field-ekspedisi",
  name: "  EKSPEDISI ",
  options: [
    { value: "jne_reg", label: "JNE Regular" },
    { value: "sicepat_best", label: "SiCepat BEST" },
  ],
};

const existingReceipt = {
  id: "attachment-resi-1",
  cardId: "card-1",
  attachableType: "file",
  attachableId: "file-old-1",
  type: "attachment",
  isCover: false,
  metadata: { category: "Resi" },
  file: {
    id: "file-old-1",
    name: "resi-lama.jpg",
    url: "https://files.example/resi-lama.jpg",
    size: 1.5,
    sizeUnit: "MB",
    mimeType: "image/jpeg",
  },
};

const buildShipment = (overrides: Record<string, unknown> = {}) => ({
  id: "shipment-1",
  updated_at: "2026-09-08T00:00:00.000Z",
  ekspedisi_option_value: "jne_reg",
  waybill_id: "WAYBILL-123",
  courier_code: "jne",
  courier_service_code: "reg",
  ...overrides,
});

const buildShipmentHook = (shipment: ReturnType<typeof buildShipment> | null = null) => ({
  shipment,
  isLoading: false,
  saveShipment: mockSaveShipment,
  deleteShipment: mockDeleteShipment,
  isSaving: false,
  isDeleting: false,
});

const buildAttachmentHook = (cardAttachments: (typeof existingReceipt)[] = []) => ({
  cardAttachments,
  isLoading: false,
  addAttachmentAsync: mockAddAttachmentAsync,
  deleteAttachmentAsync: mockDeleteAttachmentAsync,
  isAddingAttachment: false,
  isDeletingAttachment: false,
});

const renderShipment = (props: Partial<React.ComponentProps<typeof Shipment>> = {}) =>
  render(
    <Shipment
      open
      onClose={mockOnClose}
      cardId="card-1"
      workspaceId="workspace-1"
      cardCustomFields={[ekspedisiField] as any}
      {...props}
    />,
  );

describe("Shipment", () => {
  beforeAll(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: mockCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: mockRevokeObjectURL,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBoardPermissionsContext.mockReturnValue({
      canUpdateCard: () => true,
      canManageCardCustomFields: () => true,
    });
    mockUseCardShipment.mockReturnValue(buildShipmentHook());
    mockUseCardAttachment.mockReturnValue(buildAttachmentHook());
    mockSaveShipment.mockResolvedValue(undefined);
    mockDeleteShipment.mockResolvedValue(undefined);
    mockAddAttachmentAsync.mockResolvedValue(undefined);
    mockDeleteAttachmentAsync.mockResolvedValue(undefined);
    mockModalConfirm.mockImplementation(({ onOk }) => onOk());
  });

  it("opens as a modal, prefills shipment data, and normalizes Ekspedisi options", async () => {
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));
    mockUseCardAttachment.mockReturnValue(buildAttachmentHook([existingReceipt]));

    renderShipment();

    expect(screen.getByRole("dialog", { name: "Input Resi" })).not.toBeNull();
    await waitFor(() => {
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
        "WAYBILL-123",
      );
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        "jne_reg",
      );
    });
    expect(
      (screen.getByRole("option", { name: "JNE Regular" }) as HTMLOptionElement)
        .value,
    ).toBe("jne_reg");
    expect(screen.getByText("resi-lama.jpg")).not.toBeNull();
    expect(mockUseCardShipment).toHaveBeenCalledWith(
      "card-1",
      "workspace-1",
      { enabled: true },
    );
    expect(mockUseCardAttachment).toHaveBeenCalledWith("card-1", { fetch: true });
  });

  it.each([
    ["jne", "reg", "Status mapping: jne / reg"],
    [null, null, "Status mapping: Ekspedisi belum didukung Biteship"],
  ])(
    "shows the saved courier mapping status",
    (courierCode, serviceCode, expectedStatus) => {
      mockUseCardShipment.mockReturnValue(
        buildShipmentHook(buildShipment({
          courier_code: courierCode,
          courier_service_code: serviceCode,
        })),
      );

      renderShipment();

      expect(screen.getByText(expectedStatus)).not.toBeNull();
    },
  );

  it("keeps save disabled when the required receipt image is missing", () => {
    renderShipment();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "sicepat_best" },
    });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "WB-456" },
    });

    expect(
      (screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("uploads and attaches a selected image before replacing the old receipt", async () => {
    const unrelatedAttachment = {
      ...existingReceipt,
      id: "attachment-other",
      attachableId: "file-other",
      metadata: { category: "Other" },
    };
    mockUseCardAttachment.mockReturnValue(
      buildAttachmentHook([existingReceipt, unrelatedAttachment]),
    );
    mockUploadFile.mockResolvedValue({ data: { id: "file-new" } });
    const file = new File(["receipt"], "capture.jpg", { type: "image/jpeg" });

    renderShipment();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "sicepat_best" },
    });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  WB-456  " },
    });
    fireEvent.change(screen.getByLabelText("Pilih gambar resi"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() =>
      expect(mockSaveShipment).toHaveBeenCalledWith({
        waybill_id: "WB-456",
        ekspedisi_option_value: "sicepat_best",
      }),
    );
    expect(mockUploadFile).toHaveBeenCalledWith(file, {
      cardId: "card-1",
      name: "Resi - WB-456.jpg",
    });
    expect(mockAddAttachmentAsync).toHaveBeenCalledWith({
      cardId: "card-1",
      attachableType: "file",
      attachableId: "file-new",
      isCover: false,
      type: "attachment",
      metadata: { category: "Resi" },
    });
    expect(mockDeleteAttachmentAsync).toHaveBeenCalledTimes(1);
    expect(mockDeleteAttachmentAsync).toHaveBeenCalledWith({
      attachmentId: "attachment-resi-1",
      cardId: "card-1",
      attachableType: "file",
      attachableId: "file-old-1",
    });
    expect(mockAddAttachmentAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteAttachmentAsync.mock.invocationCallOrder[0],
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockRevokeObjectURL).toHaveBeenCalled());
  });

  it("disables editing for a read-only user", async () => {
    mockUseBoardPermissionsContext.mockReturnValue({
      canUpdateCard: () => false,
      canManageCardCustomFields: () => true,
    });
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));
    mockUseCardAttachment.mockReturnValue(buildAttachmentHook([existingReceipt]));

    renderShipment();

    await waitFor(() =>
      expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(
        true,
      ),
    );
    expect((screen.getByRole("combobox") as HTMLSelectElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole("button", { name: "Simpan" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "Hapus" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ganti gambar resi" })).toBeNull();
    expect((screen.getByRole("button", { name: "Batal" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("deletes the shipment and every Resi attachment after confirmation", async () => {
    const secondReceipt = {
      ...existingReceipt,
      id: "attachment-resi-2",
      attachableId: "file-old-2",
    };
    const unrelatedAttachment = {
      ...existingReceipt,
      id: "attachment-other",
      attachableId: "file-other",
      metadata: { category: "FU Pelunasan" },
    };
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));
    mockUseCardAttachment.mockReturnValue(
      buildAttachmentHook([existingReceipt, secondReceipt, unrelatedAttachment]),
    );

    renderShipment();
    fireEvent.click(screen.getByRole("button", { name: "Hapus" }));

    expect(mockModalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hapus data resi?",
        okText: "Hapus",
      }),
    );
    await waitFor(() => expect(mockDeleteShipment).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockDeleteAttachmentAsync).toHaveBeenCalledTimes(2),
    );
    expect(mockDeleteAttachmentAsync).toHaveBeenCalledWith({
      attachmentId: "attachment-resi-1",
      cardId: "card-1",
      attachableType: "file",
      attachableId: "file-old-1",
    });
    expect(mockDeleteAttachmentAsync).toHaveBeenCalledWith({
      attachmentId: "attachment-resi-2",
      cardId: "card-1",
      attachableType: "file",
      attachableId: "file-old-2",
    });
    await waitFor(() => expect(mockOnClose).toHaveBeenCalledTimes(1));
  });
});

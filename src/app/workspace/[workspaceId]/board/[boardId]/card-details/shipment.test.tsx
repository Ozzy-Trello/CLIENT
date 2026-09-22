import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Shipment, { RESI_BLOCKED_MESSAGE, canInputResi } from "./shipment";

const mockUseCardShipment = jest.fn();
const mockUseEkspedisiCourierMappings = jest.fn();
const mockUseCardAttachment = jest.fn();
const mockUseBoardPermissionsContext = jest.fn();
const mockUploadFile = jest.fn();
const mockModalConfirm = jest.fn();
const mockCreateObjectURL = jest.fn(() => "blob:receipt-preview");
const mockRevokeObjectURL = jest.fn();

jest.mock("lucide-react", () => ({
  Camera: () => <span aria-hidden="true" />,
  FileImage: () => <span aria-hidden="true" />,
  RefreshCw: () => <span aria-hidden="true" />,
  Trash2: () => <span aria-hidden="true" />,
  Upload: () => <span aria-hidden="true" />,
}));

jest.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: ({ onScan }: any) => (
    <button
      type="button"
      data-testid="qr-scan-trigger"
      onClick={() => onScan([{ rawValue: "SCANNED-WAYBILL-999" }])}
    >
      trigger scan
    </button>
  ),
}));

jest.mock("@components/qr-overlay", () => ({
  __esModule: true,
  default: () => <div data-testid="qr-overlay" />,
}));

jest.mock("@hooks/card_shipment", () => ({
  useCardShipment: (...args: unknown[]) => mockUseCardShipment(...args),
  useEkspedisiCourierMappings: (...args: unknown[]) =>
    mockUseEkspedisiCourierMappings(...args),
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
  const Modal = ({ open, title, children, footer, styles }: any) =>
    open ? (
      <div
        role="dialog"
        aria-label={title}
        data-body-padding={styles?.body?.padding}
      >
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
    Input: React.forwardRef(({ onChange, onPressEnter, ...props }: any, ref: any) => (
      <input
        ref={ref}
        {...props}
        onChange={onChange}
        onKeyDown={(event) => event.key === "Enter" && onPressEnter?.(event)}
      />
    )),
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
    Typography: {
      Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    message: {
      error: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
    },
  };
});

const mockSaveShipment = jest.fn();
const mockDeleteShipment = jest.fn();
const mockGenerateWaybill = jest.fn();
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
  updatedAt: "2026-09-08T00:00:00.000Z",
  ekspedisiOptionValue: "jne_reg",
  waybillId: "WAYBILL-123",
  courierCode: "jne",
  courierServiceCode: "reg",
  ...overrides,
});

const buildShipmentHook = (shipment: ReturnType<typeof buildShipment> | null = null) => ({
  shipment,
  isLoading: false,
  saveShipment: mockSaveShipment,
  deleteShipment: mockDeleteShipment,
  generateWaybill: mockGenerateWaybill,
  isSaving: false,
  isDeleting: false,
  isGenerating: false,
});

const buildMappingHook = (overrides: Record<string, unknown> = {}) => ({
  mappings: [
    { label: "JNE Regular", courierCode: "jne", courierServiceCode: "reg" },
  ],
  isLoading: false,
  isUnavailable: false,
  ...overrides,
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

describe("canInputResi", () => {
  const lists = [
    { id: "list-antrian", name: "Antrian Kirim" },
    { id: "list-resi", name: "  Menunggu Resi " },
    { id: "list-selesai", name: "Selesai" },
  ];

  it("opens the button only on the Menunggu Resi list", () => {
    expect(canInputResi(lists, "list-resi")).toBe(true);
    expect(canInputResi(lists, "list-antrian")).toBe(false);
    expect(canInputResi(lists, "list-selesai")).toBe(false);
  });

  it("stays closed while the list is still unknown", () => {
    expect(canInputResi([], "list-resi")).toBe(false);
    expect(canInputResi(lists, undefined)).toBe(false);
    expect(canInputResi(lists, "list-missing")).toBe(false);
    expect(canInputResi([{ id: "list-resi" }], "list-resi")).toBe(false);
  });

  it("names the list the card still has to reach", () => {
    expect(RESI_BLOCKED_MESSAGE).toBe("Card belum ada di list Menunggu Resi");
  });
});

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
    mockUseEkspedisiCourierMappings.mockReturnValue(buildMappingHook());
    mockUseCardAttachment.mockReturnValue(buildAttachmentHook());
    mockSaveShipment.mockResolvedValue(undefined);
    mockDeleteShipment.mockResolvedValue(undefined);
    mockAddAttachmentAsync.mockResolvedValue(undefined);
    mockDeleteAttachmentAsync.mockResolvedValue(undefined);
    mockGenerateWaybill.mockResolvedValue({
      data: { waybillId: "OZXIND1709260002" },
    });
    mockModalConfirm.mockImplementation(({ onOk }) => onOk());
  });

  it("opens as a modal, prefills shipment data, and normalizes Ekspedisi options", async () => {
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));
    mockUseCardAttachment.mockReturnValue(buildAttachmentHook([existingReceipt]));

    renderShipment();

    const dialog = screen.getByRole("dialog", { name: "Input Resi" });
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("data-body-padding")).toBe("4px");
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

  it("remaps the status as soon as another courier is picked", async () => {
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));

    renderShipment();

    await waitFor(() =>
      expect(screen.getByText("Status mapping: jne / reg")).not.toBeNull(),
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "sicepat_best" },
    });

    expect(screen.queryByText("Status mapping: jne / reg")).toBeNull();
    expect(
      screen.getByText(
        "Status mapping: Ekspedisi ini tidak bisa dilacak by sistem Ozzy Clothing",
      ),
    ).not.toBeNull();
  });

  it("hides the status until a courier is picked", () => {
    renderShipment();

    expect(screen.queryByText(/Status mapping:/)).toBeNull();
  });

  it("prefills the courier from the Ekspedisi custom field when no shipment exists", async () => {
    renderShipment({
      cardCustomFields: [
        { ...ekspedisiField, valueOption: "sicepat_best" },
      ] as any,
    });

    await waitFor(() =>
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        "sicepat_best",
      ),
    );
  });

  it("lets the Ekspedisi custom field win over a stale shipment courier", async () => {
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));

    renderShipment({
      cardCustomFields: [
        { ...ekspedisiField, valueOption: "sicepat_best" },
      ] as any,
    });

    await waitFor(() =>
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        "sicepat_best",
      ),
    );
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
      "WAYBILL-123",
    );
  });

  it("falls back to the shipment courier when the custom field value is unknown", async () => {
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));

    renderShipment({
      cardCustomFields: [{ ...ekspedisiField, valueOption: "retired" }] as any,
    });

    await waitFor(() =>
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        "jne_reg",
      ),
    );
  });

  it("saves the courier taken from the Ekspedisi custom field", async () => {
    mockUseCardAttachment.mockReturnValue(buildAttachmentHook([existingReceipt]));
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));

    renderShipment({
      cardCustomFields: [
        { ...ekspedisiField, valueOption: "sicepat_best" },
      ] as any,
    });

    await waitFor(() =>
      expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
        "sicepat_best",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() =>
      expect(mockSaveShipment).toHaveBeenCalledWith({
        waybillId: "WAYBILL-123",
        ekspedisiOptionValue: "sicepat_best",
      }),
    );
  });

  it.each([
    [{ isLoading: true }, "Status mapping: Memeriksa dukungan sistem Ozzy Clothing..."],
    [{ isUnavailable: true }, "Status mapping: Data ekspedisi Ozzy Clothing tidak dapat dimuat"],
  ])("reports the catalog state instead of guessing", (override, expected) => {
    mockUseEkspedisiCourierMappings.mockReturnValue(
      buildMappingHook({ mappings: [], ...override }),
    );
    mockUseCardShipment.mockReturnValue(buildShipmentHook(buildShipment()));

    renderShipment();

    expect(screen.getByText(expected)).not.toBeNull();
  });

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
        waybillId: "WB-456",
        ekspedisiOptionValue: "sicepat_best",
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
    expect(mockDeleteAttachmentAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockSaveShipment.mock.invocationCallOrder[0],
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockRevokeObjectURL).toHaveBeenCalled());
  });

  it("does not save the waybill when attaching the receipt image fails", async () => {
    mockUploadFile.mockResolvedValue({ data: { id: "file-new" } });
    mockAddAttachmentAsync.mockRejectedValue(new Error("Attachment gagal"));
    const file = new File(["receipt"], "capture.jpg", { type: "image/jpeg" });

    renderShipment();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "sicepat_best" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "WB-456" } });
    fireEvent.change(screen.getByLabelText("Pilih gambar resi"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(mockAddAttachmentAsync).toHaveBeenCalled());
    expect(mockSaveShipment).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
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

  it("focuses the waybill input as soon as the modal opens", async () => {
    renderShipment();

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("textbox"));
    });
  });

  it("captures a pasted image anywhere in the modal as the receipt, even outside the drop zone", async () => {
    renderShipment();

    const file = new File(["receipt"], "receipt.png", { type: "image/png" });
    const clipboardData = { files: [file] } as unknown as DataTransfer;

    fireEvent(
      screen.getByRole("dialog"),
      Object.assign(new Event("paste", { bubbles: true, cancelable: true }), {
        clipboardData,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("receipt.png")).not.toBeNull();
    });
  });

  it("ignores a pasted image while the waybill input is focused, so typing isn't interrupted", async () => {
    renderShipment();

    const file = new File(["receipt"], "receipt.png", { type: "image/png" });
    const clipboardData = { files: [file] } as unknown as DataTransfer;
    const input = screen.getByRole("textbox");

    fireEvent(
      input,
      Object.assign(new Event("paste", { bubbles: true, cancelable: true }), {
        clipboardData,
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText("receipt.png")).toBeNull();
    });
  });

  it("fills the waybill field from a scanned QR/barcode", async () => {
    renderShipment();

    fireEvent.click(screen.getByRole("button", { name: /scan qr/i }));
    fireEvent.click(screen.getByTestId("qr-scan-trigger"));

    await waitFor(() => {
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
        "SCANNED-WAYBILL-999",
      );
    });
  });

  describe("Ozzy Xpress", () => {
    const ozzyField = {
      ...ekspedisiField,
      options: [
        ...ekspedisiField.options,
        { value: "Ozzy-Xpress", label: "Ozzy Xpress" },
      ],
    };

    it("generates the waybill as soon as Ozzy Xpress is picked", async () => {
      renderShipment({ cardCustomFields: [ozzyField] as any });

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Ozzy-Xpress" },
      });

      await waitFor(() => {
        expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
          "OZXIND1709260002",
        );
      });
      expect(mockGenerateWaybill).toHaveBeenCalledWith("Ozzy-Xpress");
    });

    it("generates on open when the card already carries Ozzy Xpress", async () => {
      renderShipment({
        cardCustomFields: [{ ...ozzyField, valueOption: "Ozzy-Xpress" }] as any,
      });

      await waitFor(() => {
        expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
          "OZXIND1709260002",
        );
      });
      expect(mockGenerateWaybill).toHaveBeenCalledTimes(1);
    });

    it("keeps a stored waybill instead of burning a new daily number", async () => {
      mockUseCardShipment.mockReturnValue(
        buildShipmentHook(
          buildShipment({
            ekspedisiOptionValue: "Ozzy-Xpress",
            waybillId: "OZXIND1709260001",
          }),
        ),
      );

      renderShipment({ cardCustomFields: [ozzyField] as any });

      await waitFor(() => {
        expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
          "OZXIND1709260001",
        );
      });
      expect(mockGenerateWaybill).not.toHaveBeenCalled();
    });

    it("locks the field and hides the scanner so the number cannot be typed", async () => {
      renderShipment({ cardCustomFields: [ozzyField] as any });

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Ozzy-Xpress" },
      });

      await waitFor(() => {
        expect(
          (screen.getByRole("textbox") as HTMLInputElement).readOnly,
        ).toBe(true);
      });
      expect(screen.queryByRole("button", { name: /scan qr/i })).toBeNull();
    });

    it("drops the OZX number when the courier changes away", async () => {
      renderShipment({ cardCustomFields: [ozzyField] as any });

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "Ozzy-Xpress" } });
      await waitFor(() => {
        expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(
          "OZXIND1709260002",
        );
      });

      fireEvent.change(select, { target: { value: "jne_reg" } });

      await waitFor(() => {
        expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
      });
      expect(
        (screen.getByRole("textbox") as HTMLInputElement).readOnly,
      ).toBe(false);
    });

    it("surfaces the missing-branch error and does not retry in a loop", async () => {
      mockGenerateWaybill.mockRejectedValue({
        response: { data: { message: "Isi Cabang dulu sebelum generate nomor resi" } },
      });

      renderShipment({ cardCustomFields: [ozzyField] as any });

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Ozzy-Xpress" },
      });

      await waitFor(() => {
        expect(require("antd").message.error).toHaveBeenCalledWith(
          "Isi Cabang dulu sebelum generate nomor resi",
        );
      });
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
      // Cabang tidak akan terisi sendiri, jadi percobaan ulang hanya membanjiri
      // server dan menumpuk pesan error di layar.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockGenerateWaybill).toHaveBeenCalledTimes(1);
    });
  });
});

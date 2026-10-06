import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import JSZip from "jszip";
import { message } from "antd";
import { uploadFile } from "@api/file";
import { createCardAttachment, getCardAttachments } from "@api/card_attachment";
import { Card, CardAttachment, EnumCardAttachmentType, EnumCardType } from "@myTypes/card";
import ModalJmlStitch from "./index";
import ModalJmlSablon from "../modal-jml-sablon";

jest.mock("@api/file", () => ({ uploadFile: jest.fn() }));
jest.mock("@api/card_attachment", () => ({
  createCardAttachment: jest.fn(),
  getCardAttachments: jest.fn(),
}));
jest.mock("@api/card", () => ({
  mapBackendAttachmentToFrontend: (attachment: CardAttachment) => attachment,
}));
jest.mock("@api/stitch_attachment", () => ({
  getStitchAttachments: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("@api/sablon_attachment", () => ({
  getSablonAttachments: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("@api/card_custom_field", () => ({}));
jest.mock("@hooks/card_custom_field", () => ({
  useCardCustomField: () => ({ cardCustomFields: [] }),
}));
jest.mock("@hooks/account", () => ({
  useAccountList: () => ({ data: { data: [] }, isLoading: false }),
}));
jest.mock("@hooks/useRoles", () => ({
  useRoles: () => ({ roles: [], loading: false }),
}));
jest.mock("@components/attachment-preview-modal", () => () => null);
jest.mock("lucide-react", () => ({ Upload: () => null }));

// Keep the real upload queue and React Query mutation observer. Only the
// visual controls and network are replaced so concurrent callbacks behave
// exactly as they do in the application.
jest.mock("antd", () => ({
  message: { loading: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn() },
  Button: ({ children, loading, disabled, onClick }: any) => (
    <button aria-busy={Boolean(loading)} disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
  Modal: ({ children, open, okButtonProps, confirmLoading, onOk }: any) => open ? (
    <div role="dialog">
      {children}
      <button disabled={okButtonProps?.disabled || confirmLoading} onClick={onOk}>Save</button>
    </div>
  ) : null,
  Progress: ({ percent }: any) => <div role="progressbar" aria-valuenow={percent} />,
  Table: ({ dataSource, loading }: any) => (
    <div role="table" aria-busy={Boolean(loading)}>
      {dataSource.map((row: any) => <div key={row.key}>{row.fileName}</div>)}
    </div>
  ),
  Space: ({ children }: any) => <div>{children}</div>,
  Typography: { Text: ({ children }: any) => <span>{children}</span> },
  InputNumber: () => null,
  Select: () => null,
}));

const uploadFileMock = jest.mocked(uploadFile);
const createAttachmentMock = jest.mocked(createCardAttachment);
const getAttachmentsMock = jest.mocked(getCardAttachments);
const card: Card = { id: "card-1", name: "Upload test", listId: "list-1", type: EnumCardType.Regular };

const archive = async (imageCount: number) => {
  const zip = new JSZip();
  for (let i = 1; i <= imageCount; i += 1) {
    zip.file(`design-${i}.jpg`, "fixture");
    zip.file(`design-${i}.DGT`, "embroidery fixture");
  }
  return new File([await zip.generateAsync({ type: "blob" })], "designs.zip", { type: "application/zip" });
};

describe.each([
  ["Stitch", ModalJmlStitch, EnumCardAttachmentType.Stitch],
  ["Sablon", ModalJmlSablon, EnumCardAttachmentType.Sablon],
] as const)("%s ZIP upload", (_name, Component, attachmentType) => {
  let queryClient: QueryClient;
  let saved: CardAttachment[];
  let pending: Map<string, { succeed: () => void; fail: () => void }>;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    saved = [];
    pending = new Map();
    getAttachmentsMock.mockImplementation(async () => ({ data: [...saved] }));
    uploadFileMock.mockImplementation(async (file) => ({
      data: { id: (file as File).name },
    }) as any);
    createAttachmentMock.mockImplementation((params) => new Promise((resolve, reject) => {
      const fileName = params.attachableId!;
      pending.set(fileName, {
        succeed: () => {
          const attachment: CardAttachment = {
            ...params,
            id: `attachment-${fileName}`,
            createdBy: "user-1",
            createdAt: "2026-10-06T09:00:00Z",
            file: {
              id: fileName,
              name: fileName,
              url: `https://example.test/${fileName}`,
              mimeType: fileName.endsWith(".jpg") ? "image/jpeg" : "application/zip",
            },
          } as CardAttachment;
          saved.push(attachment);
          resolve({ data: attachment });
        },
        fail: () => reject(new Error(`Failed to attach ${fileName}`)),
      });
    }));
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  const uploadArchive = async (imageCount: number) => {
    const file = await archive(imageCount);
    const view = render(
      <QueryClientProvider client={queryClient}>
        <Component open onClose={jest.fn()} card={card} workspaceId="workspace-1" boardId="board-1" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(getAttachmentsMock).toHaveBeenCalled());
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(pending.size).toBe(Math.min(3, imageCount + 1)));
  };

  const finishBatch = async (failedFile?: string) => {
    const batch = Array.from(pending.entries());
    pending.clear();
    // Complete the last request first to exercise out-of-order responses.
    await act(async () => {
      for (const [fileName, request] of batch.reverse()) {
        if (fileName === failedFile) request.fail();
        else request.succeed();
      }
    });
  };

  const expectFinished = async () => {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Upload File" }).getAttribute("aria-busy")).toBe("false");
      expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.getAllByRole("table").every((table) => table.getAttribute("aria-busy") === "false")).toBe(true);
    });
    expect(screen.queryByRole("progressbar")).toBeNull();
  };

  it("finishes a ZIP with one JPG, even though the archive and image upload concurrently", async () => {
    await uploadArchive(1);
    await finishBatch();

    expect(saved).toHaveLength(2);
    await expectFinished();
    expect(screen.getByText("design-1")).not.toBeNull();
    expect(message.success).toHaveBeenCalledWith(expect.objectContaining({ content: "Upload complete" }));
  });

  it("advances the progress bar and finishes a ZIP with more than three JPGs", async () => {
    await uploadArchive(7);
    await finishBatch();
    await waitFor(() => expect(screen.getByText("Uploading 3/8")).not.toBeNull());
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("38");
    await waitFor(() => expect(pending.size).toBe(3));
    await finishBatch();
    await waitFor(() => expect(screen.getByText("Uploading 6/8")).not.toBeNull());
    await waitFor(() => expect(pending.size).toBe(2));
    await finishBatch();

    await expectFinished();
    expect(saved).toHaveLength(8);
    expect(createAttachmentMock).toHaveBeenCalledTimes(8);
    expect(saved.every((attachment) => attachment.type === attachmentType)).toBe(true);
    expect(uploadFileMock.mock.calls.map(([file]) => (file as File).name).sort()).toEqual([
      ...Array.from({ length: 7 }, (_, i) => `design-${i + 1}.jpg`), "designs.zip",
    ].sort());
    for (let i = 1; i <= 7; i += 1) expect(screen.getByText(`design-${i}`)).not.toBeNull();
  });

  it("finishes with a partial-failure message when an earlier concurrent attachment fails", async () => {
    await uploadArchive(3);
    await finishBatch("design-1.jpg");
    await waitFor(() => expect(pending.size).toBe(1));
    await finishBatch();

    await expectFinished();
    expect(saved).toHaveLength(3);
    expect(message.success).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalledWith(expect.objectContaining({
      content: "3/4 ter-upload. Gagal: designs.zip / design-1.jpg",
    }));
    expect(screen.getByText("design-2")).not.toBeNull();
    expect(screen.getByText("design-3")).not.toBeNull();
  });
});

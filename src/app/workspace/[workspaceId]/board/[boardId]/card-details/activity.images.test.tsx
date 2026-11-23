import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Activity from "./activity";
import { useCardActivity } from "@hooks/card_activity";
import { uploadFile } from "@api/file";

jest.mock("@hooks/card_activity", () => ({ useCardActivity: jest.fn() }));
jest.mock("@api/file", () => ({ uploadFile: jest.fn() }));
jest.mock("@hooks/account", () => ({ useAccountList: jest.fn() }));
jest.mock("@utils/general", () => ({ generateId: () => "new-activity" }));
jest.mock("next/navigation", () => ({
  useParams: () => ({ boardId: "board", workspaceId: "workspace" }),
  usePathname: () => "/workspace/workspace/board/board", useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn() }));
jest.mock("@store/notification_slice", () => ({ markNotificationReadLocally: jest.fn(), setUnreadCounts: jest.fn() }));
jest.mock("@api/notifications", () => ({ getUnreadCount: jest.fn(), markNotificationRead: jest.fn() }));
jest.mock("@providers/board-permissions-context", () => ({ useBoardPermissionsContext: () => ({ canCommentOnCard: () => true }) }));
jest.mock("@components/modal-list-card-attachment-images", () => () => null);
jest.mock("lucide-react", () => ({ ListCollapse: () => null }));
jest.mock("@ant-design/icons", () => ({ InfoCircleOutlined: () => null, MessageOutlined: () => null }));
jest.mock("antd", () => ({
  Button: ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Input: ({ prefix, ...props }: any) => <input {...props} />,
  Avatar: ({ children }: any) => <span>{children}</span>, Typography: {}, Divider: () => <hr />,
  Popconfirm: ({ children }: any) => <>{children}</>, Tooltip: ({ children }: any) => <>{children}</>,
  message: { error: jest.fn() },
}));
jest.mock("@components/rich-text-editor", () => {
  const React = require("react");
  return { __esModule: true, default: React.forwardRef(({ initialValue, onChange, onImageUpload, readOnly, placeholder }: any, _ref: any) => <div>
    <textarea aria-label={placeholder} value={initialValue} readOnly={readOnly} onChange={e => onChange(e.target.value)} />
    <button disabled={readOnly} onClick={() => { void onImageUpload(new File(["image"], "image.png", { type: "image/png" })).then((url: string) => onChange(`<img src="${url}">`)).catch(() => {}); }}>Insert image</button>
  </div>) };
});

const card: any = { id: "card", cover: "" };
const user: any = { id: "user", fullname: "User" };
const embedded = '<p>Before</p><img src="data:image/png;base64,aGVsbG8="><p>After</p>';
const linked = '<p>Before</p><img src="https://files.test/image.png"><p>After</p>';
const setup = (comments: any[] = []) => {
  const addCardActivity = jest.fn().mockResolvedValue({});
  const updateComment = jest.fn().mockResolvedValue({});
  (useCardActivity as jest.Mock).mockReturnValue({ cardActivities: comments, filter: "comment", setFilter: jest.fn(),
    addCardActivity, updateComment, deleteComment: jest.fn(), isAddingActivity: false, isUpdatingComment: false });
  const view = render(<Activity card={card} setCard={jest.fn()} currentUser={user} />);
  return { ...view, addCardActivity, updateComment };
};
const openNew = (html: string) => {
  fireEvent.click(screen.getByPlaceholderText("Write a comment..."));
  fireEvent.change(screen.getByRole("textbox", { name: "Write your comment here..." }), { target: { value: html } });
};
const existing = (text: string) => [{ id: "activity", senderUserId: user.id, senderUserUsername: "User", comment: { text } }];

describe("comment images", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uploads embedded images before creating a comment and preserves their position", async () => {
    (uploadFile as jest.Mock).mockResolvedValue({ data: { url: "https://files.test/image.png" } });
    const { addCardActivity } = setup();
    openNew(embedded);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(addCardActivity).toHaveBeenCalledWith(expect.objectContaining({ comment: { text: linked } }));
    expect(uploadFile).toHaveBeenCalledWith(expect.any(File), { cardId: card.id, prefix: "card-comment" });
    expect(screen.queryByRole("textbox", { name: "Write your comment here..." })).toBeNull();
  });

  it("waits for the server to confirm creation before closing the draft", async () => {
    let complete!: (value: any) => void;
    const { addCardActivity } = setup();
    addCardActivity.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    openNew("<p>Draft</p>");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect((screen.getByRole("textbox", { name: "Write your comment here..." }) as HTMLTextAreaElement).value).toBe("<p>Draft</p>");
    await act(async () => complete({}));
    expect(screen.queryByRole("textbox", { name: "Write your comment here..." })).toBeNull();
  });

  it("keeps a failed new comment draft open", async () => {
    const { addCardActivity } = setup();
    addCardActivity.mockRejectedValue(new Error("offline"));
    openNew("<p>Draft</p>");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect((screen.getByRole("textbox", { name: "Write your comment here..." }) as HTMLTextAreaElement).value).toBe("<p>Draft</p>");
  });

  it("does not create a comment if image conversion fails", async () => {
    (uploadFile as jest.Mock).mockRejectedValue(new Error("offline"));
    const { addCardActivity } = setup();
    openNew(embedded);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(addCardActivity).not.toHaveBeenCalled();
    expect((screen.getByRole("textbox", { name: "Write your comment here..." }) as HTMLTextAreaElement).value).toBe(embedded);
  });

  it.each(["create", "edit"])("blocks %s while a directly inserted image is uploading", async mode => {
    let complete!: (value: any) => void;
    (uploadFile as jest.Mock).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const { addCardActivity, updateComment } = setup(mode === "edit" ? existing("<p>Draft</p>") : []);
    if (mode === "edit") fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    else openNew("");
    fireEvent.click(screen.getByRole("button", { name: "Insert image" }));
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => complete({ data: { url: "https://files.test/image.png" } }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    if (mode === "edit") expect(updateComment).toHaveBeenCalledWith("activity", '<img src="https://files.test/image.png">');
    else expect(addCardActivity).toHaveBeenCalledWith(expect.objectContaining({ comment: { text: '<img src="https://files.test/image.png">' } }));
  });

  it("does not post an old draft after switching cards during upload", async () => {
    let complete!: (value: any) => void;
    (uploadFile as jest.Mock).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const { addCardActivity, rerender } = setup();
    openNew(embedded);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    rerender(<Activity card={{ ...card, id: "other-card" }} setCard={jest.fn()} currentUser={user} />);
    await act(async () => complete({ data: { url: "https://files.test/image.png" } }));
    expect(addCardActivity).not.toHaveBeenCalled();
    fireEvent.click(screen.getByPlaceholderText("Write a comment..."));
    expect((screen.getByRole("textbox", { name: "Write your comment here..." }) as HTMLTextAreaElement).value).toBe("");
  });

  it("converts old images before updating a comment", async () => {
    (uploadFile as jest.Mock).mockResolvedValue({ data: { url: "https://files.test/image.png" } });
    const { updateComment } = setup(existing(embedded));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(updateComment).toHaveBeenCalledWith("activity", linked);
    expect(screen.queryByRole("textbox", { name: "Edit your comment..." })).toBeNull();
  });

  it("allows image-only edits and keeps the edit open on a server error", async () => {
    const { updateComment } = setup(existing('<img src="https://files.test/image.png">'));
    updateComment.mockRejectedValue(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(updateComment).toHaveBeenCalledWith("activity", '<img src="https://files.test/image.png">');
    expect(screen.getByRole("textbox", { name: "Edit your comment..." })).toBeTruthy();
  });
});

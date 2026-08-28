import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useDispatch, useSelector } from "react-redux";
import { getUnreadCount } from "@api/notifications";
import { UnreadCommentGate } from "./unread-comment-gate";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock("@api/notifications", () => ({
  getUnreadCount: jest.fn(),
}));

jest.mock("@utils/token-storage", () => ({
  __esModule: true,
  default: { clearTokens: jest.fn() },
}));

jest.mock("antd", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

describe("UnreadCommentGate", () => {
  const dispatch = jest.fn();
  let state: any;

  beforeEach(() => {
    jest.clearAllMocks();
    state = {
      notificationState: {
        commentUnreadCount: 0,
        commentGateEnabled: false,
        isReviewingComment: false,
      },
    };
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockImplementation((selector) => selector(state));
  });

  it("locks only when the backend enables the gate and comments remain unread", async () => {
    (getUnreadCount as jest.Mock).mockResolvedValue({
      unreadCount: 2,
      generalUnreadCount: 0,
      commentUnreadCount: 2,
      commentGateEnabled: true,
    });
    state.notificationState.commentUnreadCount = 2;
    state.notificationState.commentGateEnabled = true;

    render(<UnreadCommentGate />);

    expect(await screen.findByRole("dialog")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lihat Comment" }));
    expect(dispatch).toHaveBeenCalledTimes(3);
  });

  it("fails open when the canonical count request fails", async () => {
    (getUnreadCount as jest.Mock).mockRejectedValue(new Error("offline"));

    render(<UnreadCommentGate />);

    await waitFor(() => expect(getUnreadCount).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

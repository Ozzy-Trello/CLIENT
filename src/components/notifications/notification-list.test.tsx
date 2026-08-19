import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@api/notifications";
import { NotificationList, getNotificationTarget } from "./notification-list";
import { NotificationItem } from "@myTypes/notification";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
    onAuxClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        event.preventDefault();
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock("@api/notifications", () => ({
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markNotificationRead: jest.fn(),
}));

const baseNotification: NotificationItem = {
  id: "1",
  type: "info",
  title: "New item",
  message: null,
  cardId: null,
  listId: null,
  boardId: null,
  entityType: "notulensi",
  entityId: "note-1",
  workspaceId: "ws-1",
  createdBy: { id: "u-1", username: "john" },
  isRead: false,
  createdAt: "2026-07-29T10:00:00.000Z",
};

describe("getNotificationTarget", () => {
  it("routes notulensi notifications to detail page", () => {
    expect(getNotificationTarget(baseNotification)).toBe(
      "/workspace/ws-1/notulensi/note-1"
    );
  });

  it("routes card notifications using canonical entity ID", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: "canonical-card",
        boardId: "board-1",
        listId: "list-1",
        cardId: "legacy-card",
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=canonical-card&listId=list-1");
  });

  it("falls back to the legacy card ID", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: null,
        boardId: "board-1",
        cardId: "legacy-card",
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=legacy-card");
  });

  it("omits a missing list ID", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: "card-1",
        boardId: "board-1",
        listId: null,
      })
    ).toBe("/workspace/ws-1/board/board-1?cardId=card-1");
  });

  it("encodes path and query IDs", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        workspaceId: "workspace/a",
        entityType: "card",
        entityId: "card & one",
        boardId: "board/a",
        listId: "list & one",
      })
    ).toBe(
      "/workspace/workspace%2Fa/board/board%2Fa?cardId=card+%26+one&listId=list+%26+one"
    );

    expect(
      getNotificationTarget({
        ...baseNotification,
        workspaceId: "workspace/a",
        entityId: "note/a",
      })
    ).toBe("/workspace/workspace%2Fa/notulensi/note%2Fa");
  });

  it("does not route unsupported entities with board fields", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "product",
        entityId: "product-1",
        boardId: "board-1",
        cardId: "card-1",
      })
    ).toBeNull();
  });

  it.each([null, "", " ", "null", "undefined"])(
    "rejects malformed required ID %p",
    (invalidId) => {
      expect(
        getNotificationTarget({
          ...baseNotification,
          workspaceId: invalidId as string,
        })
      ).toBeNull();

      expect(
        getNotificationTarget({
          ...baseNotification,
          entityType: "card",
          entityId: invalidId,
          cardId: invalidId,
          boardId: "board-1",
        })
      ).toBeNull();

      expect(
        getNotificationTarget({
          ...baseNotification,
          entityType: "card",
          entityId: "card-1",
          boardId: invalidId,
        })
      ).toBeNull();
    }
  );

  it("returns null when notulensi or card IDs are missing", () => {
    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "notulensi",
        entityId: null,
      })
    ).toBeNull();

    expect(
      getNotificationTarget({
        ...baseNotification,
        entityType: "card",
        entityId: "card-1",
        boardId: null,
      })
    ).toBeNull();
  });
});

describe("NotificationList", () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockReturnValue([baseNotification]);
    (markNotificationRead as jest.Mock).mockResolvedValue(undefined);
  });

  it("renders navigable notifications as links and closes only on plain primary click", () => {
    const { rerender } = render(<NotificationList />);
    const link = screen.getByRole("link", { name: /New item/i });

    expect(link.getAttribute("href")).toBe("/workspace/ws-1/notulensi/note-1");
    expect(link.style.backgroundColor).toBe("rgba(59, 130, 246, 0.1)");
    fireEvent.click(link, { ctrlKey: true });
    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ payload: false }));

    jest.clearAllMocks();
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockReturnValue([baseNotification]);
    (markNotificationRead as jest.Mock).mockResolvedValue(undefined);
    rerender(<NotificationList />);
    fireEvent.click(screen.getByRole("link", { name: /New item/i }));

    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
  });

  it("marks unread links on middle click without closing the dropdown", () => {
    render(<NotificationList />);

    fireEvent(
      screen.getByRole("link", { name: /New item/i }),
      new MouseEvent("auxclick", { bubbles: true, button: 1 })
    );

    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
  });

  it("leaves non-target notifications as non-links and unread", () => {
    (useSelector as unknown as jest.Mock).mockReturnValue([
      { ...baseNotification, entityType: "product" },
    ]);

    render(<NotificationList />);

    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByText("New item"));
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("refreshes the list and count after a mark-read failure", async () => {
    (markNotificationRead as jest.Mock).mockRejectedValue(new Error("network"));
    (getNotifications as jest.Mock).mockResolvedValue({ data: [baseNotification], total: 1 });
    (getUnreadCount as jest.Mock).mockResolvedValue({ unreadCount: 1 });
    render(<NotificationList />);

    fireEvent.click(screen.getByRole("link", { name: /New item/i }), { ctrlKey: true });

    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(1, 20);
      expect(getUnreadCount).toHaveBeenCalled();
    });
  });

  it("loads the next page when clicking Show more", async () => {
    const pageOne = Array.from({ length: 20 }, (_, index) => ({
      ...baseNotification,
      id: `item-${index}`,
    }));
    (useSelector as unknown as jest.Mock)
      .mockReturnValue([])
      .mockReturnValueOnce(pageOne)
      .mockReturnValueOnce(25);
    (getNotifications as jest.Mock)
      .mockResolvedValue({ data: [{ ...baseNotification, id: "item-20" }], total: 25 });
    render(<NotificationList />);

    const showMore = screen.getByRole("button", { name: /Show more/i });
    fireEvent.click(showMore);

    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(2, 20);
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: [{ ...baseNotification, id: "item-20" }] })
    );
  });

  it("hides Show more when the loaded list matches the total", () => {
    (useSelector as unknown as jest.Mock).mockReturnValue([baseNotification]);

    render(<NotificationList />);

    expect(screen.queryByRole("button", { name: /Show more/i })).toBeNull();
  });
});

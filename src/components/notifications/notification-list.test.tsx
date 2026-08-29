import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@api/notifications";
import { NotificationList, getNotificationTarget } from "./notification-list";
import { NotificationItem } from "@myTypes/notification";

type MockNotificationState = {
  notificationState: {
    notificationsByCategory: {
      all: NotificationItem[];
      general: NotificationItem[];
      comment: NotificationItem[];
    };
    totalByCategory: {
      all: number;
      general: number;
      comment: number;
    };
    unreadCount: number;
    generalUnreadCount: number;
    commentUnreadCount: number;
    commentGateEnabled: boolean;
    isOpen: boolean;
    activeTab: "general" | "comment";
    isReviewingComment: boolean;
  };
};

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
  activityId: null,
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

  it("adds comment target params for comment notifications", () => {
    expect(
      getNotificationTarget(
        {
          ...baseNotification,
          id: "notification-1",
          type: "comment_mention",
          activityId: "activity-1",
          entityType: "card",
          entityId: "card-1",
          boardId: "board-1",
        },
        "comment"
      )
    ).toBe(
      "/workspace/ws-1/board/board-1?cardId=card-1&commentId=activity-1&notificationId=notification-1"
    );
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
  let mockState: MockNotificationState;

  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    mockState = {
      notificationState: {
        notificationsByCategory: {
          all: [baseNotification],
          general: [baseNotification],
          comment: [],
        },
        totalByCategory: {
          all: 1,
          general: 1,
          comment: 0,
        },
        unreadCount: 1,
        generalUnreadCount: 1,
        commentUnreadCount: 0,
        commentGateEnabled: true,
        isOpen: true,
        activeTab: "general",
        isReviewingComment: false,
      },
    };
    (useSelector as unknown as jest.Mock).mockImplementation((selector: (state: MockNotificationState) => unknown) =>
      selector(mockState)
    );
    (getNotifications as jest.Mock).mockResolvedValue({ data: [baseNotification], total: 1 });
    (getUnreadCount as jest.Mock).mockResolvedValue({
      unreadCount: 1,
      generalUnreadCount: 1,
      commentUnreadCount: 0,
    });
    (markNotificationRead as jest.Mock).mockResolvedValue(undefined);
  });

  it("renders navigable notifications as links and closes only on plain primary click", () => {
    const { rerender } = render(<NotificationList category="general" />);
    const link = screen.getByRole("link", { name: /New item/i });

    expect(link.getAttribute("href")).toBe("/workspace/ws-1/notulensi/note-1");
    expect(link.style.backgroundColor).toBe("rgba(59, 130, 246, 0.1)");
    fireEvent.click(link, { ctrlKey: true });
    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ payload: false }));

    jest.clearAllMocks();
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockImplementation((selector: (state: MockNotificationState) => unknown) =>
      selector(mockState)
    );
    (getNotifications as jest.Mock).mockResolvedValue({ data: [baseNotification], total: 1 });
    (getUnreadCount as jest.Mock).mockResolvedValue({
      unreadCount: 1,
      generalUnreadCount: 1,
      commentUnreadCount: 0,
    });
    (markNotificationRead as jest.Mock).mockResolvedValue(undefined);
    rerender(<NotificationList category="general" />);
    fireEvent.click(screen.getByRole("link", { name: /New item/i }));

    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
  });

  it("marks unread links on middle click without closing the dropdown", () => {
    render(<NotificationList category="general" />);

    fireEvent(
      screen.getByRole("link", { name: /New item/i }),
      new MouseEvent("auxclick", { bubbles: true, button: 1 })
    );

    expect(markNotificationRead).toHaveBeenCalledWith("1");
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
  });

  it("leaves non-target notifications as non-links and unread", () => {
    mockState.notificationState.notificationsByCategory.general = [
      { ...baseNotification, entityType: "product" },
    ];

    render(<NotificationList category="general" />);

    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByText("New item"));
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it("refreshes the list and count after a mark-read failure", async () => {
    (markNotificationRead as jest.Mock).mockRejectedValue(new Error("network"));
    (getNotifications as jest.Mock).mockResolvedValue({ data: [baseNotification], total: 1 });
    (getUnreadCount as jest.Mock).mockResolvedValue({
      unreadCount: 1,
      generalUnreadCount: 1,
      commentUnreadCount: 0,
    });
    render(<NotificationList category="general" />);

    fireEvent.click(screen.getByRole("link", { name: /New item/i }), { ctrlKey: true });

    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(1, 20, "general");
      expect(getUnreadCount).toHaveBeenCalled();
    });
  });

  it("loads the next page when clicking Show more", async () => {
    const pageOne = Array.from({ length: 20 }, (_, index) => ({
      ...baseNotification,
      id: `item-${index}`,
    }));
    mockState.notificationState.notificationsByCategory.general = pageOne;
    mockState.notificationState.totalByCategory.general = 25;
    (getNotifications as jest.Mock)
       .mockResolvedValue({ data: [{ ...baseNotification, id: "item-20" }], total: 25 });
    render(<NotificationList category="general" />);

    const showMore = screen.getByRole("button", { name: /Show more/i });
    fireEvent.click(showMore);

    await waitFor(() => {
      expect(getNotifications).toHaveBeenCalledWith(2, 20, "general");
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { category: "general", value: [{ ...baseNotification, id: "item-20" }] },
      })
    );
  });

  it("hides Show more when the loaded list matches the total", () => {
    mockState.notificationState.totalByCategory.general = 1;

    render(<NotificationList category="general" />);

    expect(screen.queryByRole("button", { name: /Show more/i })).toBeNull();
  });

  it("defers comment notification read until the target view acknowledges it", () => {
    const commentNotification = {
      ...baseNotification,
      id: "comment-1",
      type: "comment_mention",
      activityId: "activity-1",
      entityType: "card",
      entityId: "card-1",
      boardId: "board-1",
    };
    mockState.notificationState.notificationsByCategory.comment = [commentNotification];
    mockState.notificationState.totalByCategory.comment = 1;
    mockState.notificationState.commentUnreadCount = 1;

    render(<NotificationList category="comment" />);

    fireEvent.click(screen.getByRole("link", { name: /New item/i }));

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: false }));
  });

  it("prevents opening mandatory comment notifications in another tab", () => {
    const commentNotification = {
      ...baseNotification,
      id: "comment-1",
      type: "comment_mention",
      activityId: "activity-1",
      entityType: "card",
      entityId: "card-1",
      boardId: "board-1",
    };
    mockState.notificationState.notificationsByCategory.comment = [commentNotification];
    mockState.notificationState.totalByCategory.comment = 1;

    render(<NotificationList category="comment" />);
    fireEvent.click(screen.getByRole("link", { name: /New item/i }), { ctrlKey: true });

    expect(markNotificationRead).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ payload: true }));
  });

  it("filters legacy unscoped responses before the backend category contract is active", async () => {
    mockState.notificationState.notificationsByCategory.comment = [];
    (getNotifications as jest.Mock).mockResolvedValue({ data: [baseNotification], total: 1 });

    render(<NotificationList category="comment" />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { category: "comment", value: [] } }),
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { category: "comment", value: 0 } }),
      );
    });
  });

  it("keeps description mentions and notulensi discussions in the comment category", async () => {
    mockState.notificationState.notificationsByCategory.comment = [];
    const discussionNotification = {
      ...baseNotification,
      id: "discussion-1",
      type: "notulensi_comment",
    };
    const descriptionMention = {
      ...baseNotification,
      id: "description-1",
      type: "mention",
      entityType: "card",
    };
    (getNotifications as jest.Mock).mockResolvedValue({
      data: [discussionNotification, descriptionMention],
      total: 2,
    });

    render(<NotificationList category="comment" />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            category: "comment",
            value: [discussionNotification, descriptionMention],
          },
        }),
      );
    });
  });
});

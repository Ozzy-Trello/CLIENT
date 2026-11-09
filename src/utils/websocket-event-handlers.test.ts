import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import { handleCardMoved, invalidateCardLabelQueries, invalidateNotulensiNotification } from "./websocket-event-handlers";

describe("handleCardMoved", () => {
  it("moves a payload card between list caches immediately", () => {
    const queryClient = new QueryClient();
    const card = { id: "card-1", name: "Moved card", listId: "list-a" };

    queryClient.setQueryData(queryKeys.cards.list("list-a"), {
      data: [card],
    });
    queryClient.setQueryData(queryKeys.cards.list("list-b"), {
      data: [],
    });
    queryClient.setQueryData(queryKeys.cards.detail("card-1"), {
      data: card,
    });

    handleCardMoved(queryClient, {
      cardId: "card-1",
      card,
      listId: "list-b",
      boardId: "board-1",
      changes: {
        oldListId: "list-a",
        newListId: "list-b",
      },
    });

    expect(
      (queryClient.getQueryData(queryKeys.cards.list("list-a")) as any).data
    ).toEqual([]);
    expect(
      (queryClient.getQueryData(queryKeys.cards.list("list-b")) as any).data
    ).toEqual([
      {
        ...card,
        listId: "list-b",
        list_id: "list-b",
      },
    ]);
    expect(
      (queryClient.getQueryData(queryKeys.cards.detail("card-1")) as any).data
    ).toMatchObject({
      id: "card-1",
      listId: "list-b",
      list_id: "list-b",
    });
  });
});

describe("invalidateNotulensiNotification", () => {
  it("invalidates only the notified notulensi workspace and detail", () => {
    const queryClient = new QueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    invalidateNotulensiNotification(queryClient, {
      entityType: "notulensi",
      entityId: "n-1",
      workspaceId: "ws-1",
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notulensi.workspace("ws-1") });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.notulensi.detail("ws-1", "n-1") });

    invalidate.mockClear();
    invalidateNotulensiNotification(queryClient, {
      entityType: "card",
      entityId: "card-1",
      workspaceId: "ws-1",
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("invalidates Daily Activity report, comments, and access on a comment notification", () => {
    const queryClient = { invalidateQueries: jest.fn() } as any;
    invalidateNotulensiNotification(queryClient, {
      entityType: "daily_activity",
      entityId: "report-1",
      activityId: "item-1",
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["daily-activity-access-status"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["daily-activity-reports"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["daily-activity-report", "report-1"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["daily-activity-item-comments", "item-1"] });
  });
});

describe("invalidateCardLabelQueries", () => {
  it("invalidates only the changed card's label queries", () => {
    const queryClient = { invalidateQueries: jest.fn() } as any;
    invalidateCardLabelQueries(queryClient, "workspace-1", "card-1");

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["cardLabels", "workspace-1", "card-1"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["labels", "workspace-1", { cardId: "card-1" }] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
  });
});

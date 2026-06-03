import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import { handleCardMoved } from "./websocket-event-handlers";

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

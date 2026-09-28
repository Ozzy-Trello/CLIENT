import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";
import {
  invalidateCardContext,
  invalidateCardFieldValue,
} from "./query-invalidation";

const CARD = "card-1";
const OTHER_CARD = "card-2";
const LIST = "list-1";
const OTHER_LIST = "list-2";

const seed = (client: QueryClient) => {
  client.setQueryData(queryKeys.cards.detail(CARD), { data: {} });
  client.setQueryData(queryKeys.cards.detail(OTHER_CARD), { data: {} });
  client.setQueryData(queryKeys.cards.list(LIST), { data: [] });
  client.setQueryData(queryKeys.cards.list(OTHER_LIST), { data: [] });
  client.setQueryData(queryKeys.planner.v2("produksi"), { cards: [] });
};

const invalidatedKeys = (client: QueryClient): string[] =>
  client
    .getQueryCache()
    .findAll()
    .filter((query) => query.state.isInvalidated)
    .map((query) => JSON.stringify(query.queryKey));

describe("invalidateCardFieldValue", () => {
  it("refreshes only the edited card and its own list", () => {
    const client = new QueryClient();
    seed(client);

    invalidateCardFieldValue(client, { cardId: CARD, listId: LIST });

    expect(invalidatedKeys(client).sort()).toEqual(
      [
        JSON.stringify(queryKeys.cards.detail(CARD)),
        JSON.stringify(queryKeys.cards.list(LIST)),
      ].sort()
    );
  });

  it("leaves other lists and the planner untouched", () => {
    const client = new QueryClient();
    seed(client);

    invalidateCardFieldValue(client, { cardId: CARD, listId: LIST });

    const keys = invalidatedKeys(client);
    expect(keys).not.toContain(JSON.stringify(queryKeys.cards.list(OTHER_LIST)));
    expect(keys).not.toContain(
      JSON.stringify(queryKeys.cards.detail(OTHER_CARD))
    );
    expect(keys).not.toContain(
      JSON.stringify(queryKeys.planner.v2("produksi"))
    );
  });

  it("still refreshes the card when the list is unknown", () => {
    const client = new QueryClient();
    seed(client);

    invalidateCardFieldValue(client, { cardId: CARD, listId: null });

    expect(invalidatedKeys(client)).toEqual([
      JSON.stringify(queryKeys.cards.detail(CARD)),
    ]);
  });

  it("is narrower than the full card-context invalidation it replaced", () => {
    const wide = new QueryClient();
    seed(wide);
    invalidateCardContext(wide, {
      cardId: CARD,
      listId: LIST,
      boardId: "board-1",
    });

    const narrow = new QueryClient();
    seed(narrow);
    invalidateCardFieldValue(narrow, { cardId: CARD, listId: LIST });

    // The old path swept cards.all, which is a prefix of every card query.
    expect(invalidatedKeys(wide)).toContain(
      JSON.stringify(queryKeys.cards.list(OTHER_LIST))
    );
    expect(invalidatedKeys(narrow).length).toBeLessThan(
      invalidatedKeys(wide).length
    );
  });
});

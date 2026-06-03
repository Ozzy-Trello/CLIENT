import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import { queryKeys } from "@constants/query-keys";
import { Card, EnumCardType } from "@myTypes/card";
import { ApiResponse } from "@myTypes/type";

import { useCardMove } from "./card";
import { moveCard as moveCardApi } from "../api/card";

jest.mock("./websocket", () => ({
  registerMutation: jest.fn(),
}));

jest.mock("../api", () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../api/card", () => {
  return {
    __esModule: true,
    addCardLabel: jest.fn(),
    cardArchive: jest.fn(),
    cardComplete: jest.fn(),
    cardCount: jest.fn(),
    cardDetails: jest.fn(),
    cardIncomplete: jest.fn(),
    cardUnarchive: jest.fn(),
    cards: jest.fn(),
    copyCard: jest.fn(),
    createCard: jest.fn(),
    getCardByShortId: jest.fn(),
    getCardLabels: jest.fn(),
    getListDashcard: jest.fn(),
    mirrorCard: jest.fn(),
    moveCard: jest.fn(),
    moveOldCards: jest.fn(),
    removeLabelFromCard: jest.fn(),
    searchCards: jest.fn(),
    updateCard: jest.fn(),
  };
});

const moveCardMock = moveCardApi as jest.MockedFunction<typeof moveCardApi>;

const createCard = (id: string, name: string, listId: string): Card => ({
  id,
  name,
  listId,
  type: EnumCardType.Regular,
});

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe("useCardMove", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps destination cache updated when moving into a non-empty list", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const wrapper = createWrapper(queryClient);

    const sourceListId = "source-list";
    const targetListId = "target-list";
    const boardId = "board-1";
    const movingCardId = "moving-card";

    const sourceCard = createCard("source-card", "Source", sourceListId);
    const movingCard = createCard(movingCardId, "Moving", sourceListId);
    const targetCard1 = createCard("target-card-1", "Target 1", targetListId);
    const targetCard2 = createCard("target-card-2", "Target 2", targetListId);

    queryClient.setQueryData<ApiResponse<Card[]>>(queryKeys.cards.list(sourceListId), {
      status_code: 200,
      message: "ok",
      data: [sourceCard, movingCard],
    });
    queryClient.setQueryData<ApiResponse<Card[]>>(queryKeys.cards.list(targetListId), {
      status_code: 200,
      message: "ok",
      data: [targetCard1, targetCard2],
    });
    queryClient.setQueryData<ApiResponse<Card>>(queryKeys.cards.detail(movingCardId), {
      status_code: 200,
      message: "ok",
      data: movingCard,
    });

    moveCardMock.mockResolvedValue({
      status_code: 200,
      message: "ok",
      data: {
        id: movingCardId,
        listId: targetListId,
      },
    } as ApiResponse<any>);

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCardMove(boardId), { wrapper });

    act(() => {
      result.current.moveCard({
        cardId: movingCardId,
        previousListId: sourceListId,
        targetListId,
        previousPosition: 1,
        targetPosition: 1,
      });
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());

    const sourceAfterMove = queryClient.getQueryData<ApiResponse<Card[]>>(
      queryKeys.cards.list(sourceListId)
    );
    const targetAfterMove = queryClient.getQueryData<ApiResponse<Card[]>>(
      queryKeys.cards.list(targetListId)
    );
    const detailAfterMove = queryClient.getQueryData<ApiResponse<Card>>(
      queryKeys.cards.detail(movingCardId)
    );

    expect(sourceAfterMove?.data?.map((card) => card.id)).toEqual(["source-card"]);
    expect(targetAfterMove?.data?.map((card) => card.id)).toEqual([
      "target-card-1",
      movingCardId,
      "target-card-2",
    ]);
    expect(detailAfterMove?.data?.listId).toBe(targetListId);

    const invalidatedListKeys = invalidateSpy.mock.calls
      .map(([arg]) => (Array.isArray((arg as any)?.queryKey) ? (arg as any).queryKey : null))
      .filter((key): key is string[] => !!key && key[0] === "cards" && key[1] === "list");

    expect(invalidatedListKeys).toHaveLength(0);
  });
});

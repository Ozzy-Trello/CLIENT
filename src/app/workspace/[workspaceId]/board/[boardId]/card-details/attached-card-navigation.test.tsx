import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import AttachedCard from "./attached-card";
import { Card } from "@myTypes/card";

const mockPush = jest.fn();
const mockOpenCardDetail = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({
    boardId: "board-current",
    workspaceId: "workspace-1",
  }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

jest.mock("@providers/card-detail-context", () => ({
  useCardDetailContext: () => ({
    openCardDetail: mockOpenCardDetail,
  }),
}));

jest.mock("@hooks/card-details", () => ({
  useCardDetails: () => ({
    card: null,
    completeCard: jest.fn(),
    incompleteCard: jest.fn(),
  }),
}));

jest.mock("@hooks/card-time-in-lists", () => ({
  useCardTimeInList: () => ({
    timeInLists: [],
  }),
}));

jest.mock("lucide-react", () => ({
  Unlink: () => <span />,
}));

jest.mock(
  "@app/workspace/[workspaceId]/board/[boardId]/draggable-card/regular",
  () => ({
    __esModule: true,
    default: ({ card }: any) => (
      <div data-testid="regular-card">{card.name}</div>
    ),
  })
);

function makeCrossboardCard(): Card {
  return {
    id: "card-other-board",
    name: "Other Board Card",
    listId: "list-other",
    listName: "Other List",
    boardId: "board-other",
    boardName: "Other Board",
    type: "regular",
  } as any;
}

function makeSameBoardCard(): Card {
  return {
    id: "card-same-board",
    name: "Same Board Card",
    listId: "list-same",
    listName: "Same List",
    boardId: "board-current",
    boardName: "Current Board",
    type: "regular",
  } as any;
}

describe("AttachedCard — cross-board navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls router.push to the linked card's board when boardId differs from current route", () => {
    render(<AttachedCard card={makeCrossboardCard()} />);

    fireEvent.click(screen.getByTestId("regular-card"));

    expect(mockPush).toHaveBeenCalledWith(
      "/workspace/workspace-1/board/board-other?cardId=card-other-board&listId=list-other"
    );
    expect(mockOpenCardDetail).not.toHaveBeenCalled();
  });

  it("calls openCardDetail (no router.push) when linked card is on the same board", () => {
    render(<AttachedCard card={makeSameBoardCard()} />);

    fireEvent.click(screen.getByTestId("regular-card"));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockOpenCardDetail).toHaveBeenCalled();
  });
});

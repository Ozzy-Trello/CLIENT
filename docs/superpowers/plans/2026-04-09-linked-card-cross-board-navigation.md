# Linked Card Cross-Board Navigation Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user clicks a linked card that belongs to a different board, navigate to that board instead of silently opening the wrong board's card detail modal.

**Architecture:** Two bugs are fixed in two files. First, `attachments.tsx` stops poisoning the linked card fallback with the parent card's board/list IDs. Second, `attached-card.tsx` gets a cross-board navigation check in `handleClick` — if `augmentedCard.boardId !== routeBoardId`, it does `router.push` to the correct board URL instead of calling `openCardDetail`.

**Tech Stack:** Next.js 14, React, TypeScript, Jest + React Testing Library

---

## File Map

- **Modify:** `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attachments.tsx:675-685`
  - Remove `listId`, `listName`, `boardId`, `boardName` from the fallback card object
- **Modify:** `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card.tsx`
  - Add `useRouter` to imports from `next/navigation`
  - Extract `workspaceId` from `useParams`
  - Call `useRouter()`
  - Replace `handleClick` with cross-board-aware version
- **Create:** `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card-navigation.test.tsx`

---

### Task 1: Fix fallback card data in `attachments.tsx`

**Files:**
- Modify: `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attachments.tsx:675-685`

This is a one-block fix. The fallback card object was copying the *parent* card's `listId/listName/boardId/boardName`, causing `AttachedCard` to initialize with wrong context when `attachment.targetCard` is null.

- [x] **Step 1: Replace the fallback card object**

Find this block (around line 675):

```typescript
          const linkedCard: Card =
            attachment.targetCard ||
            ({
              id: attachment.attachableId,
              name: attachment.name || "Linked card",
              listId: card.listId,
              listName: card.listName,
              boardId: card.boardId,
              boardName: card.boardName,
              type: EnumCardType.Regular,
            } as Card);
```

Replace with:

```typescript
          const linkedCard: Card =
            attachment.targetCard ||
            ({
              id: attachment.attachableId,
              name: attachment.name || "Linked card",
              type: EnumCardType.Regular,
            } as Card);
```

- [ ] **Step 2: TypeScript compile check**

```bash
cd /Users/fishy/Desktop/work/ozzy/client
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/fishy/Desktop/work/ozzy/client
git add src/app/workspace/\[workspaceId\]/board/\[boardId\]/card-details/attachments.tsx
git commit -m "fix(linked-card): don't copy parent board/list into linked card fallback

When attachment.targetCard is null, the fallback was inheriting the
parent card's listId/listName/boardId/boardName. This caused AttachedCard
to initialize with wrong context for cross-board linked cards."
```

---

### Task 2: Test + implement cross-board navigation in `attached-card.tsx`

**Files:**
- Create: `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card-navigation.test.tsx`
- Modify: `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card.tsx`

- [ ] **Step 1: Create the test file**

Create `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card-navigation.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run tests — verify first test FAILS**

```bash
cd /Users/fishy/Desktop/work/ozzy/client
npm test -- attached-card-navigation --no-coverage 2>&1 | tail -20
```

Expected: First test FAILS (`mockPush` never called — `useRouter` not yet imported). Second test PASSES.

- [ ] **Step 3: Update imports in `attached-card.tsx`**

Find line 7 (current import from `next/navigation`):
```typescript
import { useParams } from "next/navigation";
```

Replace with:
```typescript
import { useParams, useRouter } from "next/navigation";
```

- [ ] **Step 4: Add `workspaceId` extraction and `router` call**

Find this block (around line 40–52):
```typescript
  const params = useParams() as Record<string, string | string[] | undefined>;
  const boardIdParam = params?.boardId;
  const routeBoardId = Array.isArray(boardIdParam)
    ? boardIdParam[0] || ""
    : boardIdParam || "";
  const [isHovered, setIsHovered] = useState<boolean>(false);
```

Replace with:
```typescript
  const params = useParams() as Record<string, string | string[] | undefined>;
  const boardIdParam = params?.boardId;
  const routeBoardId = Array.isArray(boardIdParam)
    ? boardIdParam[0] || ""
    : boardIdParam || "";
  const workspaceIdParam = params?.workspaceId;
  const workspaceId = Array.isArray(workspaceIdParam)
    ? workspaceIdParam[0] || ""
    : workspaceIdParam || "";
  const router = useRouter();
  const [isHovered, setIsHovered] = useState<boolean>(false);
```

- [ ] **Step 5: Replace `handleClick`**

Find this block (around line 140–158):
```typescript
  const handleClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (
        e.target.className.includes("checkbox") ||
        e.target.closest(".delete-attachment-btn")
      ) {
        return;
      }
    }

    // Create a mock list object since we don't have the actual list data
    const mockList: AnyList = {
      id: augmentedCard.listId,
      name: augmentedCard.listName || card.listName || "Unknown List",
      boardId: augmentedCard.boardId || initialBoardId,
    };

    openCardDetail(augmentedCard, mockList);
  };
```

Replace with:
```typescript
  const handleClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      if (
        e.target.className.includes("checkbox") ||
        e.target.closest(".delete-attachment-btn")
      ) {
        return;
      }
    }

    const targetBoardId = augmentedCard.boardId || initialBoardId;
    const targetListId = augmentedCard.listId || initialListId;

    // Navigate to the linked card's board if it's on a different board
    if (targetBoardId && targetBoardId !== routeBoardId) {
      router.push(
        `/workspace/${workspaceId}/board/${targetBoardId}?cardId=${augmentedCard.id}&listId=${targetListId}`
      );
      return;
    }

    // Same board — open card detail modal as before
    const mockList: AnyList = {
      id: targetListId,
      name: augmentedCard.listName || card.listName || "Unknown List",
      boardId: targetBoardId,
    };

    openCardDetail(augmentedCard, mockList);
  };
```

- [ ] **Step 6: TypeScript compile check**

```bash
cd /Users/fishy/Desktop/work/ozzy/client
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 7: Run tests — verify both PASS**

```bash
npm test -- attached-card-navigation --no-coverage 2>&1 | tail -20
```

Expected: 2 tests PASS.

- [ ] **Step 8: Run full test suite — check for regressions**

```bash
npm test -- --no-coverage 2>&1 | tail -15
```

Expected: No new failures.

- [ ] **Step 9: Commit**

```bash
cd /Users/fishy/Desktop/work/ozzy/client
git add src/app/workspace/\[workspaceId\]/board/\[boardId\]/card-details/attached-card.tsx \
        src/app/workspace/\[workspaceId\]/board/\[boardId\]/card-details/attached-card-navigation.test.tsx
git commit -m "fix(linked-card): navigate to correct board when clicking cross-board linked card

Clicking a linked card on a different board now does router.push to
/workspace/.../board/{targetBoardId}?cardId=...&listId=... instead of
opening the card detail modal within the wrong board context.
Same-board linked cards still open the modal as before."
```

---

## Verification

After deploying:
1. Open a card that has a linked card from a **different board**
2. Click the linked card
3. Expected: browser navigates to the other board's URL with the card pre-opened (`?cardId=...&listId=...`)
4. Open a card that has a linked card on the **same board**
5. Click the linked card
6. Expected: card detail modal opens without navigation (existing behaviour preserved)

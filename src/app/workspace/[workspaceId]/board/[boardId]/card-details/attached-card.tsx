import { useCardDetailContext } from "@providers/card-detail-context";
import { Card } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { CheckboxChangeEvent } from "antd";
import { useMemo, useState } from "react";
import { useCardDetails } from "@hooks/card-details";
import { useParams, useRouter } from "next/navigation";
import { Button } from "antd";
import { Unlink } from "lucide-react";
import RegularCard from "@app/workspace/[workspaceId]/board/[boardId]/draggable-card/regular";
import { useCardTimeInList } from "@hooks/card-time-in-lists";

interface AttachedCardProps {
  card: Card;
  onDelete?: () => void;
}

// Local helper to convert seconds to a verbose string (e.g., "1 hour 20 minutes")
function secondsToLongString(totalSeconds: number | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return "--";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  // show seconds only if no larger units or non-zero
  if (!days && !hours && !minutes) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  } else if (seconds) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  }
  return parts.join(" ");
}

const AttachedCard: React.FC<AttachedCardProps> = ({ card, onDelete }) => {
  const { openCardDetail } = useCardDetailContext();
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
  const initialListId =
    card.listId ?? (card as any)?.list_id ?? (card as any)?.listId ?? "";
  const initialBoardId =
    card.boardId ??
    (card as any)?.board_id ??
    (card as any)?.boardId ??
    routeBoardId;
  const {
    card: detailedCard,
    completeCard,
    incompleteCard,
  } = useCardDetails(card.id, initialListId, initialBoardId);

  const baseCard: Card = useMemo(() => {
    if (detailedCard) {
      return {
        ...card,
        ...detailedCard,
      };
    }
    return card;
  }, [card, detailedCard]);

  // Fetch time in lists for this card and compute derived time values
  const { timeInLists } = useCardTimeInList(baseCard?.id || "");

  const derivedFormattedTimeInList = useMemo(() => {
    const entry = timeInLists?.find((t) => t.listId === baseCard?.listId);
    return (
      entry?.formattedTimeInList ??
      baseCard?.formattedTimeInList ??
      card?.formattedTimeInList
    );
  }, [timeInLists, baseCard?.listId, baseCard?.formattedTimeInList, card?.formattedTimeInList]);

  const totalSecondsOnBoard = useMemo(() => {
    if (!timeInLists || timeInLists.length === 0) return 0;
    return timeInLists.reduce((sum, t) => sum + (t.totalSeconds || 0), 0);
  }, [timeInLists]);

  const derivedFormattedTimeInBoard = useMemo(() => {
    if (totalSecondsOnBoard > 0) return secondsToLongString(totalSecondsOnBoard);
    return baseCard?.formattedTimeInBoard ?? card?.formattedTimeInBoard;
  }, [totalSecondsOnBoard, baseCard?.formattedTimeInBoard, card?.formattedTimeInBoard]);

  // Create an augmented card passed to RegularCard (provides computed times while preserving original data)
  const augmentedCard: Card = useMemo(() => {
    const resolvedListId = baseCard.listId ?? initialListId;
    const resolvedBoardId = baseCard.boardId ?? initialBoardId;
    const resolvedListName = baseCard.listName ?? card.listName;
    const resolvedBoardName = baseCard.boardName ?? card.boardName;
    return {
      ...baseCard,
      listId: resolvedListId,
      boardId: resolvedBoardId,
      listName: resolvedListName,
      boardName: resolvedBoardName,
      formattedTimeInList: derivedFormattedTimeInList,
      formattedTimeInBoard: derivedFormattedTimeInBoard,
    };
  }, [
    baseCard,
    derivedFormattedTimeInList,
    derivedFormattedTimeInBoard,
    initialListId,
    initialBoardId,
    card.listName,
    card.boardName,
  ]);

  // Handle missing card data
  if (!augmentedCard || !augmentedCard.id) {
    return (
      <div className="bg-gray-100 rounded-lg border border-gray-200 p-4 min-h-[120px] flex items-center justify-center">
        <span className="text-gray-500 text-sm">Card data unavailable</span>
      </div>
    );
  }

  const onCompletionChange = (e: CheckboxChangeEvent, changedCard: Card) => {
    e.stopPropagation();
    const isComplete = e.target.checked;
    const targetListId =
      changedCard?.listId ??
      (changedCard as any)?.list_id ??
      initialListId ??
      "";
    if (isComplete) {
      completeCard({ listId: targetListId, cardId: changedCard.id });
    } else {
      incompleteCard({ listId: targetListId, cardId: changedCard.id });
    }
  };

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

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200
        w-full relative group cursor-pointer
        hover:border-blue-500 transition-all duration-200
        ${isHovered ? "shadow-md" : ""}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-card-id={augmentedCard.id}
    >

      {/* Delete button - visible on hover */}
      {onDelete && (
        <Button
          className="delete-attachment-btn absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          icon={<Unlink size={14} />}
          size="small"
          danger
          onClick={handleDelete}
          title="Unlink card"
        />
      )}

      {/* Render the shared RegularCard for consistent UI with draggable cards */}
      <RegularCard
        card={augmentedCard}
        isHovered={isHovered}
        onCompletionChange={onCompletionChange}
      />
      {/* Board and List info badge */}
      <div className="space-y-1 px-4 pt-2">
        <div className="text-gray-700 text-[11px]">
          <span className="font-medium mr-1">Board:</span>
          {augmentedCard.boardName || "Unknown Board"}
        </div>
        <div className="text-gray-700 text-[11px]">
          <span className="font-medium mr-1">List:</span>
          {augmentedCard.listName || "Unknown List"}
        </div>
      </div>

    </div>
  );
};

export default AttachedCard;

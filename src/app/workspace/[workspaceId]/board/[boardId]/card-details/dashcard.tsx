import { Avatar, Button } from "antd";
import { AlignLeft } from "lucide-react";
import { FC, useMemo } from "react";
import { Card } from "@myTypes/card";
import { useCardDetailContext } from "@providers/card-detail-context";
import MembersList from "@components/members-list";
import { useDashcardList } from "@hooks/dashcard-list";
import { useDashcardCount } from "@hooks/dashcard";

interface DashcardProps {
  card: Card;
  onOpenDetail?: (card: Card) => void;
}

const Dashcard: FC<DashcardProps> = ({ card, onOpenDetail }) => {
  const { resultData, refetchList } = useDashcardList(card, { limit: 10 });
  const { count } = useDashcardCount(card.id, card.dashConfig);

  const { handleItemDashcard, setOpenEditFilter, setCurrentFilter } =
    useCardDetailContext();

  const items = useMemo(() => {
    if (!resultData?.items) return [];

    return resultData.items?.slice(0, 10);
  }, [resultData]);

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <AlignLeft size={18} />
            <h1 className="text-5xl font-bold mb-0">Dashcard</h1>
          </div>
        </div>

        <div className="ml-8 flex flex-col gap-3">
          {items.map((item) => {
            return (
              <div
                key={item.id}
                className="w-full p-3 bg-gray-100 rounded-lg flex items-center justify-between cursor-pointer"
                onClick={() => {
                  handleItemDashcard(item.id, item.listId, item.boardId);
                }}
              >
                <div>{item.name}</div>
                <div>
                  <MembersList
                    members={item.member || []}
                    membersLength={item.member?.length || 0}
                    membersLoopLimit={3}
                  />
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-gray-200 rounded-lg flex items-center text-gray-500 font-bold justify-between">
            {items.length > 0 && (
              <div>
                Showing the first {items.length} of {count}{" "}
                matching cards
              </div>
            )}
            <Button
              onClick={() => {
                setOpenEditFilter(false);
                setCurrentFilter([]);
                refetchList();
                onOpenDetail?.(card);
              }}
            >
              Explore and Edit
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashcard;

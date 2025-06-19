import { Avatar, Button } from "antd";
import { AlignLeft } from "lucide-react";
import { FC, useMemo, useState } from "react";
import ModalDashcardDetail from "@components/modal-dashcard-detail";
import { Card } from "@myTypes/card";
import { useCardDetailContext } from "@providers/card-detail-context";
import MembersList from "@components/members-list";

interface DashcardProps {
  card: Card;
}

const Dashcard: FC<DashcardProps> = ({ card }) => {
  const [open, setOpen] = useState<boolean>(false);
  const { handleItemDashcard } = useCardDetailContext();

  const items = useMemo(() => {
    if (!card?.itemDashcard) return [];

    return card.itemDashcard?.slice(0, 10);
  }, [card.itemDashcard]);

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
            {card?.itemDashcard && card.itemDashcard?.length > 0 && (
              <div>
                Showing the first {items.length} of {card.itemDashcard?.length}{" "}
                matching cards
              </div>
            )}
            <Button
              onClick={() => {
                setOpen(true);
              }}
            >
              Explore and Edit
            </Button>
          </div>
        </div>
      </div>
      <ModalDashcardDetail
        open={open}
        setOpen={setOpen}
        itemDashcard={card?.itemDashcard || []}
        dashConfig={card?.dashConfig}
        name={card?.name || ""}
      />
    </>
  );
};

export default Dashcard;

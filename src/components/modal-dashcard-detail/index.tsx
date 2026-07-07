import { Modal, TabsProps, Tabs } from "antd";
import { Dispatch, SetStateAction, FC, useEffect } from "react";
import TablePivot from "./table-pivot";
import Detail from "./detail";
import Metrics from "./metrics";
import { useCardDetailContext } from "@providers/card-detail-context";
import { Card } from "@myTypes/card";
import { useDashcardList } from "@hooks/dashcard-list";

interface ModalDashcardDetailProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  card: Card | null;
}

const ModalDashcardDetail: FC<ModalDashcardDetailProps> = ({
  open,
  setOpen,
  card,
}) => {
  const { itemDashcard, selectedCard, setSelectedCard } = useCardDetailContext();
  useDashcardList(open ? card : null, { syncContext: true });

  useEffect(() => {
    if (open && card && selectedCard?.id !== card.id) {
      setSelectedCard(card);
    }
  }, [open, card?.id, selectedCard?.id, setSelectedCard]);

  const itemTabs: TabsProps["items"] = [
    {
      key: "1",
      label: (
        <div>Table {itemDashcard?.length && `(${itemDashcard.length})`}</div>
      ),
      children: <TablePivot />,
    },
    {
      key: "2",
      label: <div>Metrics</div>,
      children: <Metrics />,
    },
  ];

  return (
    <Modal
      key={card?.id ?? "dashcard-detail"}
      title="Dashcard"
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      centered
      width={"90vw"}
    >
      <div className="flex flex-col gap-3 px-3">
        <Detail />
        <Tabs items={itemTabs} defaultActiveKey="1" />
      </div>
    </Modal>
  );
};

export default ModalDashcardDetail;

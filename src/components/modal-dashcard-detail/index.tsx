import { Modal, TabsProps, Tabs } from "antd";
import { Dispatch, SetStateAction, FC } from "react";
import TablePivot from "./table-pivot";
import Detail from "./detail";
import { useCardDetailContext } from "@providers/card-detail-context";
interface ModalDashcardDetailProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const ModalDashcardDetail: FC<ModalDashcardDetailProps> = ({
  open,
  setOpen,
}) => {
  const { itemDashcard } = useCardDetailContext();

  const itemTabs: TabsProps["items"] = [
    {
      key: "1",
      label: (
        <div>Table {itemDashcard?.length && `(${itemDashcard.length})`}</div>
      ),
      children: <TablePivot />,
    },
  ];

  return (
    <Modal
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

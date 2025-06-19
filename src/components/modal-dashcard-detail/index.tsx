import { Modal, TabsProps, Tabs } from "antd";
import { Dispatch, SetStateAction, FC } from "react";
import TablePivot from "./table-pivot";
import { IItemDashcard } from "@myTypes/card";
import Detail from "./detail";
import { DashcardConfig } from "@myTypes/dashcard";

interface ModalDashcardDetailProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  itemDashcard: IItemDashcard[];
  dashConfig: DashcardConfig | undefined;
  name: string;
}

const ModalDashcardDetail: FC<ModalDashcardDetailProps> = ({
  open,
  setOpen,
  itemDashcard,
  dashConfig,
  name,
}) => {
  const itemTabs: TabsProps["items"] = [
    {
      key: "1",
      label: (
        <div>Table {itemDashcard?.length && `(${itemDashcard.length})`}</div>
      ),
      children: <TablePivot itemDashcard={itemDashcard} />,
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
        <Detail
          itemDashcard={itemDashcard}
          dashConfig={dashConfig}
          name={name}
        />
        <Tabs items={itemTabs} defaultActiveKey="1" />
      </div>
    </Modal>
  );
};

export default ModalDashcardDetail;

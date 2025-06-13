import { Button } from "antd";
import { FC } from "react";
import { EditOutlined, CopyOutlined } from "@ant-design/icons";
import { IItemDashcard } from "@myTypes/card";
import { DashcardConfig } from "@myTypes/dashcard";

interface DetailProps {
  itemDashcard: IItemDashcard[];
  dashConfig: DashcardConfig | undefined;
}

const Detail: FC<DetailProps> = ({ itemDashcard, dashConfig }) => {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-3">
        <div
          style={{ backgroundColor: dashConfig?.backgroundColor || "#1890ff" }}
          className="w-60 h-40 rounded-lg flex items-center justify-center text-white font-bold text-xl"
        >
          {itemDashcard?.length || 0}
        </div>
      </div>
      <div className="flex gap-3">
        <Button icon={<EditOutlined />}>Edit Filters</Button>
        <Button icon={<CopyOutlined />}>Clone Dashcard</Button>
      </div>
    </div>
  );
};

export default Detail;

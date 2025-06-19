import { Button } from "antd";
import { FC } from "react";
import { EditOutlined } from "@ant-design/icons";
import { IItemDashcard } from "@myTypes/card";
import { DashcardConfig } from "@myTypes/dashcard";

interface DetailProps {
  itemDashcard: IItemDashcard[];
  dashConfig: DashcardConfig | undefined;
  name: string;
}

const Detail: FC<DetailProps> = ({ itemDashcard, dashConfig, name }) => {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-3">
        <div
          style={{ backgroundColor: dashConfig?.backgroundColor || "#1890ff" }}
          className="w-60 h-40 rounded-lg flex items-center justify-center text-white font-bold text-xl relative"
        >
          {itemDashcard?.length || 0}
          <div className="absolute top-3 left-3 text-sm">Card</div>
          <div className="absolute bottom-3 left-3 text-sm">{name}</div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button icon={<EditOutlined />}>Edit Filters</Button>
      </div>
    </div>
  );
};

export default Detail;

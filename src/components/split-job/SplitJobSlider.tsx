import React from "react";
import { Tooltip } from "antd";
import { PartitionOutlined } from "@ant-design/icons";
import SplitJobPopover from "./SplitJobPopover";

interface SplitJobSliderProps {
  workspaceId: string;
  customFieldId: string;
  cardId: string;
  jmlValue: number;
  onSplitJobsSaved?: () => void;
  isSuperAdmin?: boolean;
}

const SplitJobSlider: React.FC<SplitJobSliderProps> = ({
  workspaceId,
  customFieldId,
  cardId,
  jmlValue,
  onSplitJobsSaved,
  isSuperAdmin,
}) => {
  return (
    <Tooltip title="Split Job">
      <div className="cursor-pointer">
        <SplitJobPopover
          workspaceId={workspaceId}
          customFieldId={customFieldId}
          cardId={cardId}
          jmlTotal={jmlValue}
          onSuccess={onSplitJobsSaved}
          isSuperAdmin={isSuperAdmin}
        >
          <div className="rounded hover:bg-gray-100">
            <PartitionOutlined className="text-gray-500" />
          </div>
        </SplitJobPopover>
      </div>
    </Tooltip>
  );
};

export default SplitJobSlider;

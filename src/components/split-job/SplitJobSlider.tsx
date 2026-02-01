import React, { useState } from "react";
import { Slider, Tooltip, message } from "antd";
import { PartitionOutlined } from "@ant-design/icons";
import SplitJobPopover from "./SplitJobPopover";
import { SplitJobTemplate } from "@api/split_job";
import { useSplitJobValuesByCustomField } from "@hooks/split_job";

interface SplitJobSliderProps {
  workspaceId: string;
  customFieldId: string;
  cardId: string;
  value: number;
  onChange: (value: number) => void;
}

const SplitJobSlider: React.FC<SplitJobSliderProps> = ({
  workspaceId,
  customFieldId,
  cardId,
  value,
  onChange,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<SplitJobTemplate | null>(
    null
  );
  const [messageApi, contextHolder] = message.useMessage();

  // Get the mutation function to create a new split job value
  const { createValue, isCreating } = useSplitJobValuesByCustomField(cardId);

  const handleTemplateSelect = async (template: SplitJobTemplate) => {
    setActiveTemplate(template);

    try {
      // Create a new split job value with default name and value of 0
      const defaultValue = 0; // Default to 0%
      await createValue({
        templateId: template.id,
        name: template.name.toLowerCase(),
        value: defaultValue,
      });

      messageApi.success(`Added new split job value for ${template.name}`);

      // Don't update the custom field value when creating a split job value
      // The custom field value should remain unchanged
    } catch (error) {
      console.error("Failed to create split job value:", error);
      messageApi.error("Failed to create split job value");
    }
  };

  return (
    <>
      {contextHolder}
      <Tooltip title="Split Job">
        <div className="cursor-pointer">
          <SplitJobPopover
            workspaceId={workspaceId}
            customFieldId={customFieldId}
            cardId={cardId}
            onTemplateSelect={handleTemplateSelect}
          >
            <div className="rounded hover:bg-gray-100">
              <PartitionOutlined
                className={isCreating ? "text-blue-500" : "text-gray-500"}
                spin={isCreating}
              />
            </div>
          </SplitJobPopover>
        </div>
      </Tooltip>
    </>
  );
};

export default SplitJobSlider;

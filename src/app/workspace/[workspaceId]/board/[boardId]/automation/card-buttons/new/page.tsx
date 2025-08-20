"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Typography, message, Card } from "antd";
import { ArrowLeft } from "lucide-react";
import { createCardButton } from "@api/automation_rule";
import { AutomationRuleActionApiData } from "@myTypes/type";
import CardButtonSelectAction from "./card-button-select-action";

const { Title, Text } = Typography;

const NewCardButtonPage: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const [buttonLabel, setButtonLabel] = useState("");
  const [selectedActions, setSelectedActions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActionsChange = (actions: any[]) => {
    setSelectedActions(actions);
  };

  const handleSubmit = async () => {
    if (!buttonLabel.trim()) {
      message.error("Please enter a button label");
      return;
    }

    if (selectedActions.length === 0) {
      message.error("Please select at least one action");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Transform selected actions to API format
      const actionsData: AutomationRuleActionApiData[] = selectedActions.map((action) => ({
        groupType: action.groupType || "",
        type: action.selectedActionItem?.type || "",
        condition: action.selectedActionItem || {},
      }));

      await createCardButton(
        workspaceId as string,
        boardId as string,
        {
          label: buttonLabel.trim(),
          actions: actionsData
        }
      );

      message.success("Card button created successfully!");
      router.push(`/workspace/${workspaceId}/board/${boardId}/automation/card-buttons`);
    } catch (error) {
      console.error("Failed to create card button:", error);
      message.error("Failed to create card button. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/card-buttons`);
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={handleBack}
            className="flex items-center"
          >
            Back
          </Button>
          <div>
            <Title level={3} className="mb-0">
              Create New Card Button
            </Title>
            <Text type="secondary">
              Create a custom button that will appear on your cards
            </Text>
          </div>
        </div>

        {/* Button Label Input */}
        <Card className="mb-6">
          <div className="mb-4">
            <Title level={4} className="mb-2">
              Button Label
            </Title>
            <Text type="secondary" className="text-sm">
              Enter the text that will appear on the button
            </Text>
          </div>
          <Input
            placeholder="e.g., Mark as Priority, Send for Review, Archive"
            value={buttonLabel}
            onChange={(e) => setButtonLabel(e.target.value)}
            size="large"
            maxLength={50}
            showCount
          />
        </Card>

        {/* Actions Selection */}
        <Card className="mb-6">
          <div className="mb-4">
            <Title level={4} className="mb-2">
              Actions
            </Title>
            <Text type="secondary" className="text-sm">
              Choose what happens when your trigger conditions are met
            </Text>
          </div>
          <CardButtonSelectAction
            selectedActions={selectedActions}
            onActionsChange={handleActionsChange}
          />
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button size="large" onClick={handleBack}>
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!buttonLabel.trim() || selectedActions.length === 0}
          >
            Create Card Button
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewCardButtonPage;
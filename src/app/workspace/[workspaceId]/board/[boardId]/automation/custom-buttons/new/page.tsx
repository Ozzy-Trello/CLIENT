"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Typography, Card, message } from "antd";
import { SelectedAction } from "@myTypes/type";
import { createCardButton } from "@api/automation_rule";
import { AutomationRuleActionApiData } from "@myTypes/type";
import { CardButtonSelectAction } from "./card-button-select-action";
import { useRuleLookups } from "@hooks/useRuleLookups";

const { Title } = Typography;

interface NewCardButtonPageProps {
  params: {
    workspaceId: string;
    boardId: string;
  };
}

export default function NewCardButtonPage({ params }: NewCardButtonPageProps) {
  const router = useRouter();
  const [buttonLabel, setButtonLabel] = useState("");
  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use rule lookups to cache UUID data for proper rendering
  const ruleLikeActions = useMemo(
    () =>
      selectedActions.map((action) => ({
        condition: action.selectedActionItem || {},
      })),
    [selectedActions]
  );
  useRuleLookups(ruleLikeActions);

  // Handle navigation back to custom buttons list
  const handleNavigateBack = () => {
    router.push(
      `/workspace/${params.workspaceId}/board/${params.boardId}/automation/custom-buttons`
    );
  };

  const handleActionsChange = (actions: SelectedAction[]) => {
    setSelectedActions(actions);
  };

  const handleSubmit = async () => {
    if (!buttonLabel.trim() || selectedActions.length === 0) return;

    setIsLoading(true);
    try {
      const actionsData: AutomationRuleActionApiData[] = selectedActions.map(
        (action) => ({
          groupType: action.groupType || "",
          type: action.selectedActionItem?.type || "",
          condition: action.selectedActionItem || {},
        })
      );

      await createCardButton(params.workspaceId, params.boardId, {
        label: buttonLabel,
        actions: actionsData,
      });

      message.success("Card button created successfully");
      // Navigate back to custom buttons list
      handleNavigateBack();
    } catch (error: any) {
      console.error("Error creating card button:", error);
      message.error(
        error?.response?.data?.message || "Failed to create card button"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <Card>
        <div style={{ padding: "24px" }}>
          <Title level={2}>Create New Card Button</Title>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ marginBottom: "8px" }}>
              <label htmlFor="buttonLabel" style={{ fontWeight: 500 }}>
                Button Label
              </label>
            </div>
            <Input
              id="buttonLabel"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              placeholder="e.g., Mark as Complete, Assign to Me, Move to Review"
              size="large"
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <Title level={3}>Actions</Title>
            <CardButtonSelectAction
              selectedActions={selectedActions}
              onActionsChange={handleActionsChange}
            />
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
          >
            <Button onClick={handleNavigateBack}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={
                !buttonLabel.trim() || selectedActions.length === 0 || isLoading
              }
              loading={isLoading}
            >
              {isLoading ? "Creating..." : "Create Card Button"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, message, Spin } from "antd";
import { Typography } from "antd";
const { Title, Text } = Typography;
import { ArrowLeft } from "lucide-react";
import { SelectedAction, AutomationRuleActionApiData } from "@myTypes/type";
import { useRuleLookups } from "@hooks/useRuleLookups";
import { getCardButtonById, updateCardButton } from "@api/automation_rule";
import CardButtonSelectAction from "../../new/card-button-select-action";

interface EditCardButtonPageProps {
  params: {
    workspaceId: string;
    boardId: string;
    buttonId: string;
  };
}

export default function EditCardButtonPage({ params }: EditCardButtonPageProps) {
  const router = useRouter();
  const [buttonLabel, setButtonLabel] = useState("");
  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use rule lookups to cache UUID data for proper rendering
  const ruleLikeActions = useMemo(
    () => [
      {
        condition: {},
        action: selectedActions.map((action) => ({
          condition: action.selectedActionItem || {},
          type: action.selectedActionItem?.type || action.type || "",
        })),
      },
    ],
    [selectedActions]
  );
  const { loading: lookupLoading } = useRuleLookups(ruleLikeActions);

  // Fetch existing button data
  useEffect(() => {
    const fetchButtonData = async () => {
      try {
        setIsLoading(true);
        const response = await getCardButtonById(
          params.workspaceId,
          params.buttonId
        );
        
        const buttonData = response.data;
        
        // Extract button label from camelCase API response
        const label = buttonData.condition?.buttonLabel || "";
        setButtonLabel(label);
        
        // Transform API actions to SelectedAction format
        const transformedActions: SelectedAction[] = (buttonData.action || []).map((action: any, index: number) => ({
          groupType: action.groupType || "",
          type: action.type || "",
          selectedActionItem: {
            ...action.condition || action,
            type: action.type || "",
          },
          id: `action-${index}`,
        }));
        
        setSelectedActions(transformedActions);
      } catch (error: any) {
        console.error("Error fetching button data:", error);
        message.error(
          error?.response?.data?.message || "Failed to load button data"
        );
        // Navigate back if button not found
        handleNavigateBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchButtonData();
  }, [params.workspaceId, params.boardId, params.buttonId]);

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

    setIsSubmitting(true);
    try {
      const actionsData: AutomationRuleActionApiData[] = selectedActions.map(
        (action) => ({
          groupType: action.groupType || "",
          type: action.selectedActionItem?.type || "",
          condition: action.selectedActionItem || {},
        })
      );

      await updateCardButton(
        params.workspaceId,
        params.boardId,
        params.buttonId,
        {
          label: buttonLabel,
          actions: actionsData,
        }
      );

      message.success("Card button updated successfully");
      // Navigate back to custom buttons list
      handleNavigateBack();
    } catch (error: any) {
      console.error("Error updating card button:", error);
      message.error(
        error?.response?.data?.message || "Failed to update card button"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <Card>
        <div style={{ padding: "24px" }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              type="text"
              icon={<ArrowLeft size={16} />}
              onClick={handleNavigateBack}
              className="flex items-center"
            >
              Back
            </Button>
            <div>
              <Title level={2}>Edit Card Button</Title>
              <Text type="secondary">
                Update your custom card button settings
              </Text>
            </div>
          </div>

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
            {lookupLoading ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin size="small" /> Loading action details...
              </div>
            ) : (
              <CardButtonSelectAction
                selectedActions={selectedActions}
                onActionsChange={handleActionsChange}
              />
            )}
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
          >
            <Button onClick={handleNavigateBack}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={
                !buttonLabel.trim() || selectedActions.length === 0 || isSubmitting
              }
              loading={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Card Button"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
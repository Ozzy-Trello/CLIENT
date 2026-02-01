"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Typography, Card, Spin, message, Modal, Space } from "antd";
import { Plus, Settings, Trash2 } from "lucide-react";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { getCardButtonsForBoard, deleteRule } from "@api/automation_rule";
import { AutomationRuleApiData } from "@myTypes/type";
import { renderRulePatternHuman } from "@utils/rule-render";

const { Title, Text } = Typography;

interface CardButton {
  id: string;
  label: string;
  description?: string;
  actionsCount: number;
  actions: any[];
}

const CardButtonsPage: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const [cardButtons, setCardButtons] = useState<CardButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCardButtons();
  }, [workspaceId, boardId]);

  const fetchCardButtons = async () => {
    try {
      setIsLoading(true);
      const response = await getCardButtonsForBoard(
        workspaceId as string,
        boardId as string
      );

      // Transform automation rules to card buttons format
      const buttons: CardButton[] = (response.data || []).map(
        (rule: AutomationRuleApiData) => {
          // Generate human-readable description for actions
          let actionDescriptions = "";
          if (
            rule.action &&
            Array.isArray(rule.action) &&
            rule.action.length > 0
          ) {
            const actionTexts = rule.action
              .map((action: any) => {
                if (!action.type || !action.condition) {
                  return "";
                }
                return renderRulePatternHuman(action.type, action.condition);
              })
              .filter((text: string) => text && text.trim() !== "");

            actionDescriptions =
              actionTexts.length > 0
                ? actionTexts.join(", ")
                : `${rule.action.length} action${
                    rule.action.length > 1 ? "s" : ""
                  } (details unavailable)`;
          }

          return {
            id: rule.id,
            label: rule.condition?.label || "Unnamed Button",
            description: actionDescriptions || "No actions configured",
            actionsCount: rule.action?.length || 0,
            actions: rule.action || [],
          };
        }
      );

      setCardButtons(buttons);
    } catch (error) {
      console.error("Failed to fetch card buttons:", error);
      message.error("Failed to load card buttons");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push(
      `/workspace/${workspaceId}/board/${boardId}/automation/card-buttons/new`
    );
  };

  const handleEditButton = (buttonId: string) => {
    router.push(
      `/workspace/${workspaceId}/board/${boardId}/automation/card-buttons/${buttonId}/edit`
    );
  };

  const handleDeleteButton = (buttonId: string, buttonLabel: string) => {
    Modal.confirm({
      title: "Delete Card Button",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div className="p-4">
          <p className="mb-3">
            Are you sure you want to delete this card button?
          </p>
          <div className="mt-2 p-3 bg-gray-50 rounded border">
            <Text className="text-sm text-gray-700">{buttonLabel}</Text>
          </div>
          <p className="mt-3 text-red-600 text-sm">
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteRule(workspaceId as string, buttonId);
          message.success("Card button deleted successfully");
          await fetchCardButtons();
        } catch (error) {
          console.error("Failed to delete button:", error);
          message.error("Failed to delete card button");
        }
      },
    });
  };

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center pb-4">
        <div>
          <Title level={3}>Card Buttons</Title>
          <Text type="secondary" className="text-sm">
            Create card action buttons that appear on your cards
          </Text>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleCreateNew}
        >
          Create New Card Button
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      ) : cardButtons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardButtons.map((button) => (
            <Card
              key={button.id}
              className="hover:shadow-md transition-shadow"
              actions={[
                <Button
                  key="edit"
                  type="text"
                  icon={<Settings size={16} />}
                  onClick={() => handleEditButton(button.id)}
                >
                  Edit
                </Button>,
                <Button
                  key="delete"
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  onClick={() => handleDeleteButton(button.id, button.label)}
                >
                  Delete
                </Button>,
              ]}
            >
              <Card.Meta
                title={
                  <span className="text-lg font-semibold">{button.label}</span>
                }
                description={
                  <div>
                    <div className="mb-2">
                      <Text className="text-xs text-gray-500">
                        {button.actionsCount} action
                        {button.actionsCount !== 1 ? "s" : ""}
                      </Text>
                    </div>
                    {button.description && (
                      <div className="p-2 bg-gray-50 rounded text-xs">
                        <Text type="secondary" className="text-xs">
                          {button.description}
                        </Text>
                      </div>
                    )}
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mb-4">
            <Settings size={64} className="text-gray-300 mx-auto" />
          </div>
          <Title level={4} className="text-gray-500 mb-2">
            No Card Buttons Yet
          </Title>
          <Text type="secondary" className="text-lg mb-6 block">
            Create your first card button to add quick actions to your cards.
          </Text>
          <Button
            type="primary"
            size="large"
            icon={<Plus size={16} />}
            onClick={handleCreateNew}
          >
            Create Your First Card Button
          </Button>
        </div>
      )}
    </div>
  );
};

export default CardButtonsPage;

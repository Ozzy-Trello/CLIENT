"use client";
import { useParams, useRouter } from "next/navigation";
import { Card, Typography, Button, Row, Col } from "antd";
import { SlidersHorizontal, Zap, Settings } from "lucide-react";

const { Title, Paragraph } = Typography;

const AutomationContent: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();

  const navigateToRules = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
  };

  const navigateToCardButtons = () => {
    router.push(
      `/workspace/${workspaceId}/board/${boardId}/automation/custom-buttons`
    );
  };

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <Title level={2} className="mb-4">
          <Zap className="inline-block mr-2" size={32} />
          Board Automation
        </Title>
        <Paragraph className="text-lg text-gray-600 max-w-2xl mx-auto">
          This is where we setup our automations. Streamline your workflow by
          creating rules that automatically perform actions when certain
          conditions are met, or add card buttons for quick manual actions.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]} justify="center">
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg"
            onClick={navigateToRules}
            cover={
              <div className="flex justify-center items-center h-32 bg-gradient-to-br from-blue-50 to-blue-100">
                <SlidersHorizontal size={48} className="text-blue-600" />
              </div>
            }
          >
            <Card.Meta
              title={
                <span className="text-lg font-semibold">Automation Rules</span>
              }
              description={
                <div>
                  <Paragraph className="text-gray-600 mb-3">
                    Create automated workflows that trigger when specific
                    conditions are met. Perfect for repetitive tasks and
                    maintaining consistency.
                  </Paragraph>
                  <Button type="primary" block>
                    Manage Rules
                  </Button>
                </div>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg"
            onClick={navigateToCardButtons}
            cover={
              <div className="flex justify-center items-center h-32 bg-gradient-to-br from-green-50 to-green-100">
                <Settings size={48} className="text-green-600" />
              </div>
            }
          >
            <Card.Meta
              title={
                <span className="text-lg font-semibold">Card Buttons</span>
              }
              description={
                <div>
                  <Paragraph className="text-gray-600 mb-3">
                    Add custom action buttons to your cards for quick manual
                    operations. Ideal for one-click actions and user-triggered
                    workflows.
                  </Paragraph>
                  <Button type="primary" block>
                    Manage Buttons
                  </Button>
                </div>
              }
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AutomationContent;

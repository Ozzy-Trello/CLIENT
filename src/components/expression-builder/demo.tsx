import React, { useState } from "react";
import { Card, Typography } from "antd";
import ExpressionBuilder, { ExpressionStep } from "./index";

const ExpressionBuilderDemo: React.FC = () => {
  const [expressionSteps, setExpressionSteps] = useState<ExpressionStep[]>([]);

  const availableFields = [
    { value: "price", label: "Price" },
    { value: "quantity", label: "Quantity" },
    { value: "tax", label: "Tax" },
    { value: "discount", label: "Discount" },
  ];

  const renderExpression = () => {
    if (expressionSteps.length === 0) {
      return <span className="text-gray-400">No expression yet</span>;
    }

    return expressionSteps.map((step, index) => (
      <span key={index} className="mx-1">
        {step.label || step.value}
      </span>
    ));
  };

  return (
    <div className="p-6">
      <Typography.Title level={3}>Expression Builder Demo</Typography.Title>

      <Card title="Calculate Custom Field" className="mb-4">
        <div className="mb-4">
          <Typography.Text>calculate </Typography.Text>
          <span className="bg-blue-100 px-2 py-1 rounded">Total</span>
          <Typography.Text> using </Typography.Text>
          <ExpressionBuilder
            value={expressionSteps}
            onChange={setExpressionSteps}
            availableFields={availableFields}
          />
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded">
          <Typography.Text strong>Current Expression: </Typography.Text>
          {renderExpression()}
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded">
          <Typography.Text strong>Example Usage: </Typography.Text>
          <div className="text-sm text-gray-600 mt-1">
            • Price × Quantity + Tax = Total
          </div>
          <div className="text-sm text-gray-600">
            • (Price - Discount) × Quantity = Subtotal
          </div>
          <div className="text-sm text-gray-600">
            • Price + Tax - Discount = Final Price
          </div>
        </div>
      </Card>

      <Card title="How it works" className="mb-4">
        <div className="text-sm text-gray-600 space-y-2">
          <div>1. Click "Build expression" to open the builder</div>
          <div>2. Add fields and operations step by step</div>
          <div>
            3. The expression will be evaluated when the automation runs
          </div>
          <div>4. The result will be stored in the target field</div>
        </div>
      </Card>
    </div>
  );
};

export default ExpressionBuilderDemo;

import React, { useState } from "react";
import { Button, Select, Popover } from "antd";
import { Plus, X, Calculator } from "lucide-react";

export interface ExpressionStep {
  type: "field" | "operation";
  value: string; // field_id or operation
  label?: string; // display label
}

interface ExpressionBuilderProps {
  value: ExpressionStep[];
  onChange: (steps: ExpressionStep[]) => void;
  availableFields: Array<{ value: string; label: string }>;
}

const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  value = [],
  onChange,
  availableFields,
}) => {
  const [open, setOpen] = useState(false);

  console.log("ExpressionBuilder Debug:", {
    value,
    availableFields,
    open,
  });

  const operations = [
    { value: "+", label: "+" },
    { value: "-", label: "-" },
    { value: "*", label: "×" },
    { value: "/", label: "÷" },
  ];

  const addField = () => {
    const newStep: ExpressionStep = {
      type: "field",
      value: "",
      label: "",
    };
    onChange([...value, newStep]);
  };

  const addOperation = () => {
    const newStep: ExpressionStep = {
      type: "operation",
      value: "+",
      label: "+",
    };
    onChange([...value, newStep]);
  };

  const updateStep = (index: number, step: ExpressionStep) => {
    const newSteps = [...value];
    newSteps[index] = step;
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = value.filter((_, i) => i !== index);
    onChange(newSteps);
  };

  const renderStep = (step: ExpressionStep, index: number) => {
    if (step.type === "field") {
      return (
        <Select
          style={{ width: 120 }}
          placeholder="Select field"
          value={step.value}
          options={availableFields}
          onChange={(val, option) => {
            updateStep(index, {
              ...step,
              value: val,
              label: (option as any)?.label || val,
            });
          }}
        />
      );
    } else {
      return (
        <Select
          style={{ width: 60 }}
          value={step.value}
          options={operations}
          onChange={(val, option) => {
            updateStep(index, {
              ...step,
              value: val,
              label: (option as any)?.label || val,
            });
          }}
        />
      );
    }
  };

  const renderExpression = () => {
    if (value.length === 0) {
      return (
        <Button type="text" size="small" className="mx-2">
          <Calculator size={14} />
          Build expression
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {value.map((step, index) => (
          <div key={index} className="flex items-center gap-1">
            {renderStep(step, index)}
            <Button
              type="text"
              size="small"
              icon={<X size={12} />}
              onClick={() => removeStep(index)}
              className="p-0 h-6 w-6"
            />
          </div>
        ))}
      </div>
    );
  };

  const content = (
    <div className="p-3 flex flex-col gap-3 w-80">
      <div className="text-sm font-medium">Expression Builder</div>

      {/* Current Expression Display */}
      <div className="bg-gray-50 p-2 rounded">
        <div className="text-xs text-gray-600 mb-1">Current expression:</div>
        <div className="text-sm">
          {value.length === 0 ? (
            <span className="text-gray-400">No expression yet</span>
          ) : (
            value.map((step, index) => (
              <span key={index} className="mx-1">
                {step.label || step.value}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Add Buttons */}
      <div className="flex gap-2">
        <Button size="small" onClick={addField}>
          <Plus size={12} className="mr-1" />
          Add Field
        </Button>
        <Button size="small" onClick={addOperation}>
          <Plus size={12} className="mr-1" />
          Add Operation
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500">
        Build your expression by adding fields and operations. Example: Price ×
        Quantity + Tax
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
    >
      {renderExpression()}
    </Popover>
  );
};

export default ExpressionBuilder;

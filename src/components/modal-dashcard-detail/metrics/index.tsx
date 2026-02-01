import React, { FC, useMemo, useState } from "react";
import { Card, Select, Typography, message } from "antd";
import { useParams } from "next/navigation";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useCustomFields } from "@hooks/custom_field";
import { EnumCustomFieldType } from "@myTypes/custom-field";
import { DashcardDisplayType } from "@myTypes/dashcard";

const { Title, Text } = Typography;

type StatisticType = "sum" | "maximum" | "minimum" | "mean" | "median";

interface NumericField {
  id: string;
  name: string;
  values: number[];
}

const Metrics: FC = () => {
  const { workspaceId } = useParams();
  const {
    dashcardConfig,
    selectedCard,
    processedItemDashcard,
    updateDisplayConfig,
  } = useCardDetailContext();

  const [selectedStatistic, setSelectedStatistic] = useState<StatisticType>("sum");

  // Get all custom fields from workspace
  const { customFields } = useCustomFields(
    Array.isArray(workspaceId) ? workspaceId[0] : workspaceId as string
  );

  // Get all numeric custom fields and their values from current data
  const numericFields = useMemo(() => {
    // Get all numeric custom fields from workspace
    const allNumericFields = customFields?.filter(
      (field) => field.type === EnumCustomFieldType.Number
    ) || [];

    // Create a map to collect values for each field using field name as key
    const fieldsMap = new Map<string, NumericField>();

    // Initialize all numeric fields with empty values
    allNumericFields.forEach((field) => {
      fieldsMap.set(field.name, {
        id: field.id,
        name: field.name,
        values: [],
      });
    });

    // Collect values from current data
    processedItemDashcard.forEach((item) => {
      if (item.columns) {
        item.columns.forEach((col) => {
          // Check if this column matches a numeric custom field
          if (col.type === "number" && fieldsMap.has(col.column)) {
            const value = col.value;
            // Parse value to number if it's a string
            const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
            
            if (!isNaN(numValue)) {
              fieldsMap.get(col.column)!.values.push(numValue);
            }
          }
        });
      }
    });

    return Array.from(fieldsMap.values());
  }, [customFields, processedItemDashcard]);

  // Calculate statistics for a field
  const calculateStatistic = (values: number[], type: StatisticType): number | null => {
    if (values.length === 0) return null;

    switch (type) {
      case "sum":
        return values.reduce((acc, val) => acc + val, 0);
      case "maximum":
        return Math.max(...values);
      case "minimum":
        return Math.min(...values);
      case "mean":
        return values.reduce((acc, val) => acc + val, 0) / values.length;
      case "median":
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      default:
        return null;
    }
  };

  // Format number for display - show full numbers without abbreviations
  const formatNumber = (num: number): string => {
    return Math.round(num).toString();
  };

  const statisticOptions = [
    { label: "sum", value: "sum" },
    { label: "maximum", value: "maximum" },
    { label: "minimum", value: "minimum" },
    { label: "mean", value: "mean" },
    { label: "median", value: "median" },
  ];

  // Handle metric card click to set as dashcard display
  const handleMetricClick = (field: NumericField) => {
    const newDisplayConfig = {
      type: DashcardDisplayType.CUSTOM_FIELD_SUM,
      customFieldId: field.id,
      customFieldName: field.name,
    };
    
    updateDisplayConfig(newDisplayConfig);
    message.success(`Dashcard display set to "${field.name} ${selectedStatistic}"`);
  };

  // Handle card count click to reset to default
  const handleCardCountClick = () => {
    const newDisplayConfig = {
      type: DashcardDisplayType.CARD_COUNT,
    };
    
    updateDisplayConfig(newDisplayConfig);
    message.success("Dashcard display set to card count");
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Card Count Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Card count</h3>
        <Card
          style={{
            backgroundColor: dashcardConfig?.backgroundColor || "#1890ff",
            border: "none",
            borderRadius: "8px",
          }}
          className="w-48 h-32 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleCardCountClick}
        >
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="text-4xl font-bold">
              {processedItemDashcard?.length || 0}
            </div>
            <div className="text-sm opacity-75 mt-2">
              Click to set as display
            </div>
          </div>
        </Card>
      </div>

      {/* Numeric Fields Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Numeric fields</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Statistic</span>
            <Select
              value={selectedStatistic}
              onChange={setSelectedStatistic}
              options={statisticOptions}
              className="w-32"
              size="small"
            />
          </div>
        </div>

        {numericFields.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No numeric custom fields found
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-600">
              Click on any metric card to set it as your dashcard display
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {numericFields.map((field) => {
                const calculatedValue = calculateStatistic(field.values, selectedStatistic);
                
                return (
                  <Card
                    key={field.id}
                    style={{
                      backgroundColor: "#1890ff",
                      border: "none",
                      borderRadius: "8px",
                    }}
                    className="h-32 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleMetricClick(field)}
                  >
                    <div className="flex flex-col h-full text-white">
                      <div className="text-2xl font-bold mb-1">
                        {calculatedValue !== null ? formatNumber(calculatedValue) : "0"}
                      </div>
                      <div className="text-sm opacity-90 mb-2">
                        {field.name}
                      </div>
                      <div className="text-xs opacity-75 mt-auto">
                        {selectedStatistic} across {field.values.length} cards
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Metrics;
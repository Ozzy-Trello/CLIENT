"use client";
import { getRule } from "@api/automation_rule";
import { AutomationRuleApiData } from "@myTypes/type";
import { Button, Typography, Radio, Pagination } from "antd";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  BulbOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { renderRulePatternHuman } from "@utils/rule-render";
import { useRuleLookups } from "@hooks/useRuleLookups";

const RulePage: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const [automationRules, setAutomationRules] = useState<
    AutomationRuleApiData[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  const toNewRulePage = () => {
    router.replace(
      `/workspace/${workspaceId}/board/${boardId}/automation/rules/new`
    );
  };

  useEffect(() => {
    const fetchData = async (page: number) => {
      const result = await getRule(workspaceId as string, page, 10);
      if (result && result.data) {
        setAutomationRules(result.data || []);
        if (result.paginate) {
          const pg: any = result.paginate;
          setTotalPage(pg.total_page ?? pg.totalPage ?? 1);
        }
        console.log("Fetched automation rules:", result.data);
      } else {
        console.error("Failed to fetch automation rules:", result.message);
      }
    };

    fetchData(currentPage);
  }, [currentPage]);

  const renderType = (type: string, condition: any): string =>
    renderRulePatternHuman(type, condition);

  const { version } = useRuleLookups(automationRules);

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center pb-4">
        <Typography.Title level={3}>Rules</Typography.Title>
        <Button type="primary" onClick={toNewRulePage}>
          Create New Rule
        </Button>
      </div>

      <div className="space-y-4">
        {automationRules.length > 0 ? (
          automationRules.map((rule) => {
            let ruleDescription = "";
            if (rule.type && rule.condition) {
              ruleDescription = renderType(rule.type, rule.condition);
            }

            if (
              rule.action &&
              Array.isArray(rule.action) &&
              rule.action.length > 0
            ) {
              const actionDescriptions = rule.action
                .map((action) => renderType(action.type, action.condition))
                .join(" and ");
              ruleDescription = ruleDescription
                ? `${ruleDescription} then ${actionDescriptions}`
                : actionDescriptions;
            }

            return (
              <div key={rule.id} className="p-4 rounded shadow bg-white">
                {/* Action Icons */}
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 text-gray-600">
                    <Button type="text" icon={<EditOutlined />} />
                    <Button type="text" icon={<DeleteOutlined />} />
                    <Button type="text" icon={<CopyOutlined />} />
                    {/* <Button type="text" icon={<BulbOutlined />} />
                    <Button type="text" icon={<SwapOutlined />} /> */}
                  </div>
                  <Button type="default" size="small">
                    Add to another board
                  </Button>
                </div>

                {/* Rule description */}
                <Typography.Text code className="block mt-3 text-sm">
                  {ruleDescription || "Rule details incomplete"}
                </Typography.Text>

                {/* Enable / disable for this board */}
                <div className="mt-4">
                  <Radio.Group defaultValue="enabled">
                    <Radio value="enabled">Enable automation on board</Radio>
                    <Radio value="disabled">Disable automation on board</Radio>
                  </Radio.Group>
                </div>
              </div>
            );
          })
        ) : (
          <Typography.Text type="secondary">No rules found.</Typography.Text>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPage > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={currentPage}
            pageSize={10}
            total={totalPage * 10}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
};

export default RulePage;

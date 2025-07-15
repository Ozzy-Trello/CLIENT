"use client";
import { getRule } from "@api/automation_rule";
import { AutomationRuleApiData } from "@myTypes/type";
import { Button, Typography, Radio, Pagination, Spin } from "antd";
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
import { useLabels } from "@hooks/label";
import { useCustomFields } from "@hooks/custom_field";
import { useBoards } from "@hooks/board";
import { useLists } from "@hooks/list";
import { useRoles } from "@hooks/useRoles";
import { LookupCache } from "@utils/lookup-cache";

const RulePage: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const [automationRules, setAutomationRules] = useState<
    AutomationRuleApiData[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch and cache all labels for this workspace
  const { allLabels } = useLabels(workspaceId as string);
  const { customFields } = useCustomFields(workspaceId as string);
  const { boards } = useBoards(workspaceId as string);
  const { lists } = useLists(boardId as string);
  const { roles } = useRoles(workspaceId as string);

  // Cache all the necessary data for rule rendering
  useEffect(() => {
    if (allLabels && allLabels.length > 0) {
      LookupCache.rememberMany(
        "label",
        allLabels.map((l: { id: string; name: string }) => ({
          id: l.id,
          name: l.name,
        }))
      );
    }

    if (customFields && customFields.length > 0) {
      LookupCache.rememberMany(
        "field",
        customFields.map((f: { id: string; name: string }) => ({
          id: f.id,
          name: f.name,
        }))
      );
    }

    if (boards && boards.length > 0) {
      LookupCache.rememberMany(
        "board",
        boards.map((b) => ({
          id: b.id,
          name: b.name || b.id,
        }))
      );
    }

    if (lists && lists.length > 0) {
      LookupCache.rememberMany(
        "list",
        lists.map((l) => ({
          id: l.id,
          name: l.name || l.id,
        }))
      );
    }

    if (roles && roles.length > 0) {
      LookupCache.rememberMany(
        "role",
        roles.map((r) => ({
          id: r.id,
          name: r.name || r.id,
        }))
      );
    }
  }, [allLabels, customFields, boards, lists, roles]);

  const toNewRulePage = () => {
    router.replace(
      `/workspace/${workspaceId}/board/${boardId}/automation/rules/new`
    );
  };

  useEffect(() => {
    const fetchData = async (page: number) => {
      setIsLoading(true);
      try {
        // Pass boardId to the API for backend filtering
        const result = await getRule(
          workspaceId as string,
          page,
          10,
          boardId as string
        );
        if (result && result.data) {
          console.log("Rules fetched for board:", boardId);
          console.log("Rules count:", result.data.length);

          setAutomationRules(result.data || []);
          if (result.paginate) {
            const pg: any = result.paginate;
            setTotalPage(pg.total_page ?? pg.totalPage ?? 1);
          }
        } else {
          console.error("Failed to fetch automation rules:", result.message);
        }
      } catch (error) {
        console.error("Error fetching automation rules:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData(currentPage);
  }, [currentPage, workspaceId, boardId]);

  const renderRuleHuman = (type: string, condition: any): string => {
    return renderRulePatternHuman(type, condition);
  };

  const { loading: lookupLoading, version } = useRuleLookups(automationRules);

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center pb-4">
        <div>
          <Typography.Title level={3}>Board Automation Rules</Typography.Title>
          <Typography.Text type="secondary" className="text-sm">
            Showing automation rules for this board only
          </Typography.Text>
        </div>
        <Button type="primary" onClick={toNewRulePage}>
          Create New Rule
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : automationRules.length > 0 ? (
          automationRules.map((rule) => {
            let triggerDescription = "";
            let actionDescriptions = "";

            // Render trigger
            if (rule.type && rule.condition) {
              triggerDescription = renderRuleHuman(rule.type, rule.condition);
            }

            // Debug: Log the rule structure
            console.log("Rule structure:", {
              id: rule.id,
              type: rule.type,
              hasCondition: !!rule.condition,
              hasAction: !!rule.action,
              actionLength: rule.action?.length,
              actions: rule.action,
            });

            // Render actions with better error handling
            if (
              rule.action &&
              Array.isArray(rule.action) &&
              rule.action.length > 0
            ) {
              const actionTexts = rule.action
                .map((action, index) => {
                  console.log(`Processing action ${index}:`, action);

                  if (!action.type || !action.condition) {
                    console.warn(
                      `Action ${index} missing type or condition:`,
                      action
                    );
                    return "";
                  }

                  const actionText = renderRuleHuman(
                    action.type,
                    action.condition
                  );
                  console.log(`Action ${index} rendered as:`, actionText);
                  return actionText;
                })
                .filter((text) => text && text.trim() !== ""); // Filter out empty/whitespace-only strings

              actionDescriptions = actionTexts.join(", ");
              console.log("Final actionDescriptions:", actionDescriptions);
            }

            // Improved logic for combining trigger and actions
            let fullRuleDescription = "";
            if (triggerDescription) {
              if (actionDescriptions && actionDescriptions.trim() !== "") {
                fullRuleDescription = `${triggerDescription}, then ${actionDescriptions}`;
              } else {
                // Show that there are actions but they couldn't be rendered
                const actionCount = rule.action?.length || 0;
                if (actionCount > 0) {
                  fullRuleDescription = `${triggerDescription}, then ${actionCount} action${
                    actionCount > 1 ? "s" : ""
                  } (details unavailable)`;
                } else {
                  fullRuleDescription = triggerDescription;
                }
              }
            } else {
              fullRuleDescription =
                actionDescriptions || "Rule details incomplete";
            }

            console.log("Final description:", fullRuleDescription);

            return (
              <div
                key={rule.id}
                className="p-4 rounded-lg shadow-sm bg-white border border-gray-200"
              >
                {/* Action Icons */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 text-gray-600">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      title="Edit rule"
                    />
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      title="Delete rule"
                    />
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      title="Copy rule"
                    />
                  </div>
                  <Button type="default" size="small">
                    Add to another board
                  </Button>
                </div>

                {/* Rule description */}
                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-100">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <Typography.Text className="text-gray-900 leading-relaxed">
                        {fullRuleDescription}
                      </Typography.Text>
                    </div>
                  </div>
                </div>

                {/* Enable / disable for this board */}
                <div className="mt-4">
                  <Radio.Group defaultValue="enabled" size="small">
                    <Radio value="enabled" className="text-sm">
                      Enable automation on this board
                    </Radio>
                    <Radio value="disabled" className="text-sm">
                      Disable automation on this board
                    </Radio>
                  </Radio.Group>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Typography.Text type="secondary" className="text-lg">
              No automation rules found for this board.
            </Typography.Text>
            <div className="mt-4">
              <Button type="primary" onClick={toNewRulePage}>
                Create your first rule for this board
              </Button>
            </div>
          </div>
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

"use client";
import { getRule, deleteRule } from "@api/automation_rule";
import { AutomationRuleApiData } from "@myTypes/type";
import {
  Button,
  Typography,
  Radio,
  Pagination,
  Spin,
  Input,
  Modal,
  message,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  BulbOutlined,
  SwapOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
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
  const params = useParams();
  const workspaceId = decodeURIComponent(params.workspaceId as string);
  const boardId = decodeURIComponent(params.boardId as string);
  const router = useRouter();
  const [allAutomationRules, setAllAutomationRules] = useState<
    AutomationRuleApiData[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Client-side pagination settings
  const pageSize = 10;

  // Fetch and cache all labels for this workspace
  console.log(
    "[DEBUG] workspaceId original:",
    params.workspaceId,
    "decoded:",
    workspaceId,
    "type:",
    typeof workspaceId
  );
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
    router.push(
      `/workspace/${workspaceId}/board/${boardId}/automation/rules/new`
    );
  };

  const toEditRulePage = (ruleId: string) => {
    router.push(
      `/workspace/${workspaceId}/board/${boardId}/automation/rules/${ruleId}/edit`
    );
  };

  const handleDeleteRule = (ruleId: string, ruleDescription: string) => {
    Modal.confirm({
      title: "Delete Automation Rule",
      icon: <ExclamationCircleOutlined />,
      styles: {
        body: {
          padding: "1rem",
        },
      },
      content: (
        <div className="p-4">
          <p className="mb-3">
            Are you sure you want to delete this automation rule?
          </p>
          <div className="mt-2 p-3 bg-gray-50 rounded border">
            <Typography.Text className="text-sm text-gray-700">
              {ruleDescription}
            </Typography.Text>
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
          await deleteRule(workspaceId as string, ruleId);
          message.success("Automation rule deleted successfully");
          // Refresh the rules list by re-fetching data
          await fetchAllData();
        } catch (error) {
          console.error("Failed to delete rule:", error);
          message.error("Failed to delete automation rule");
          setIsLoading(false);
        }
      },
    });
  };

  // Function to fetch all rules data
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // Fetch all rules without pagination parameters, using fetchAll parameter
      const result = await getRule(
        workspaceId as string,
        boardId as string,
        undefined,
        undefined,
        true
      );
      if (result && result.data) {
        console.log("All rules fetched for board:", boardId);
        console.log("Total rules count:", result.data.length);

        setAllAutomationRules(result.data || []);
        // Reset to first page when data changes
        setCurrentPage(1);
      } else {
        console.error("Failed to fetch automation rules:", result.message);
      }
    } catch (error) {
      console.error("Error fetching automation rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all data once - removed currentPage dependency
  useEffect(() => {
    fetchAllData();
  }, [workspaceId, boardId]); // Removed currentPage dependency

  // Add window focus event listener to refresh data when user returns to the page
  useEffect(() => {
    const handleWindowFocus = () => {
      // Refresh data when window regains focus (e.g., when navigating back from new rule page)
      fetchAllData();
    };

    window.addEventListener("focus", handleWindowFocus);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [workspaceId, boardId]);

  const renderRuleHuman = (type: string, condition: any): string => {
    return renderRulePatternHuman(type, condition);
  };

  // Function to generate full human description for a rule
  const generateRuleDescription = (rule: AutomationRuleApiData): string => {
    let triggerDescription = "";
    let actionDescriptions = "";

    // Render trigger
    if (rule.type && rule.condition) {
      triggerDescription = renderRuleHuman(rule.type, rule.condition);
    }

    // Render actions
    if (rule.action && Array.isArray(rule.action) && rule.action.length > 0) {
      const actionTexts = rule.action
        .map((action: any) => {
          if (!action.type || !action.condition) {
            return "";
          }
          return renderRuleHuman(action.type, action.condition);
        })
        .filter((text: string) => text && text.trim() !== "");

      actionDescriptions = actionTexts.join(", ");
    }

    // Combine trigger and actions
    let fullRuleDescription = "";
    if (triggerDescription) {
      if (actionDescriptions && actionDescriptions.trim() !== "") {
        fullRuleDescription = `${triggerDescription}, then ${actionDescriptions}`;
      } else {
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
      fullRuleDescription = actionDescriptions || "Rule details incomplete";
    }

    return fullRuleDescription;
  };

  // Filter rules based on search term
  const filteredRules = useMemo(() => {
    if (!searchTerm.trim()) {
      return allAutomationRules;
    }

    const searchLower = searchTerm.toLowerCase();
    return allAutomationRules.filter((rule) => {
      const description = generateRuleDescription(rule);
      return description.toLowerCase().includes(searchLower);
    });
  }, [allAutomationRules, searchTerm]);

  // Calculate pagination for filtered results
  const totalPages = Math.ceil(filteredRules.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageRules = filteredRules.slice(startIndex, endIndex);

  // Debug pagination info
  console.log("🔍 [PAGINATION DEBUG]", {
    totalRules: allAutomationRules.length,
    filteredRules: filteredRules.length,
    pageSize,
    totalPages,
    currentPage,
    showPagination: totalPages > 1,
    searchTerm,
  });

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const { loading: lookupLoading, version } =
    useRuleLookups(allAutomationRules);

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

      {/* Search Box */}
      <div className="mb-6">
        <Input
          placeholder="Search automation rules by description (e.g., 'when card is moved', 'assign to user')"
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          size="large"
          className="max-w-2xl"
        />
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Found {filteredRules.length} rule
            {filteredRules.length !== 1 ? "s" : ""} matching "{searchTerm}"
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : filteredRules.length > 0 ? (
          currentPageRules.map((rule: AutomationRuleApiData) => {
            // Use the centralized function to generate rule description
            const fullRuleDescription = generateRuleDescription(rule);

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
                      onClick={() => rule.id && toEditRulePage(rule.id)}
                      disabled={!rule.id}
                    />
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      title="Delete rule"
                      onClick={() =>
                        rule.id &&
                        handleDeleteRule(rule.id, fullRuleDescription)
                      }
                      disabled={!rule.id}
                    />
                    {/* <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      title="Copy rule"
                    /> */}
                  </div>
                  {/* <Button type="default" size="small">
                    Add to another board
                  </Button> */}
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
                {/* <div className="mt-4">
                  <Radio.Group defaultValue="enabled" size="small">
                    <Radio value="enabled" className="text-sm">
                      Enable automation on this board
                    </Radio>
                    <Radio value="disabled" className="text-sm">
                      Disable automation on this board
                    </Radio>
                  </Radio.Group>
                </div> */}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Typography.Text type="secondary" className="text-lg">
              {searchTerm
                ? `No automation rules found matching "${searchTerm}"`
                : "No automation rules found for this board."}
            </Typography.Text>
            {!searchTerm && (
              <div className="mt-4">
                <Button type="primary" onClick={toNewRulePage}>
                  Create your first rule for this board
                </Button>
              </div>
            )}
            {searchTerm && (
              <div className="mt-4">
                <Button type="default" onClick={() => setSearchTerm("")}>
                  Clear search
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls - Updated for filtered results */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredRules.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} of ${total} ${
                searchTerm ? "filtered " : ""
              }automation rules`
            }
          />
        </div>
      )}
    </div>
  );
};

export default RulePage;

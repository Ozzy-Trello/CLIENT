"use client";
import { getRule } from '@api/automation_rule';
import { AutomationRuleApiData } from '@myTypes/type';
import { Button, Typography, Radio } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  BulbOutlined,
  SwapOutlined,
} from '@ant-design/icons';

const RulePage: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const router = useRouter();
  const [automationRules, setAutomationRules] = useState<AutomationRuleApiData[]>([]);

  const toNewRulePage = () => {
    router.replace(`/workspace/${workspaceId}/board/${boardId}/automation/rules/new`);
  };

  useEffect(() => {
    const fetchData = async () => {
      const result = await getRule(workspaceId as string);
      if (result && result.data) {
        setAutomationRules(result.data || []);
        console.log("Fetched automation rules:", result.data);
      } else {
        console.error("Failed to fetch automation rules:", result.message);
      }
    };

    fetchData();
  }, []);

  const renderType = (type: string, condition: any): string => {
    
    // Replace the placeholders
    let result = type
      .replace(/-/g, ' ')
      .replace(/<action>/, condition?.action?.label || condition?.action || '')
      .replace(/<optional_action>/, condition?.optional_action?.label || condition?.optional_action || '')
      .replace(/<by>/, condition?.by?.label || condition?.by || '')
      .replace(/<optional_by>/, condition?.optional_by?.label || condition?.optional_by || '')
      .replace(/<board>/, condition?.board?.label || condition?.board || '')
      .replace(/<optional_board>/, condition?.optional_board?.label || condition?.optional_board || '')
      .replace(/<list>/, condition?.list?.label || condition?.list || '')
      .replace(/<optional_list>/, condition?.optional_list?.label || condition?.optional_list || '')
      .replace(/<position>/, condition?.position?.label || condition?.position || '')
      .replace(/<optional_position>/, condition?.optional_position?.label || condition?.optional_position || '')
      .replace(/<filter>/, '') // remove placeholder
      .replace(/\s+/g, ' ') // clean extra spaces (fixed regex)
      .trim();
    
    return result;
  }

  return (
    <div className="min-h-screen p-4">
      <div className='flex justify-between items-center pb-4'>
        <Typography.Title level={3}>Rules</Typography.Title>
        <Button type="primary" onClick={toNewRulePage}>Create New Rule</Button>
      </div>

      <div className='space-y-4'>
        <div className='p-4 rounded shadow bg-white'>
          {/* Action Icons */}
          <div className="flex justify-between items-start">
            <div className="flex gap-2 text-gray-600">
              <Button type="text" icon={<EditOutlined />} />
              <Button type="text" icon={<DeleteOutlined />} />
              <Button type="text" icon={<CopyOutlined />} />
              <Button type="text" icon={<BulbOutlined />} />
              <Button type="text" icon={<SwapOutlined />} />
            </div>
            <Button type="default" size="small">Add to another board</Button>
          </div>

          {/* Rule Type */}
          {automationRules.length > 0 ? (
            automationRules.map((rule) => {
              let ruleDescription = '';
              if (rule.type && rule.condition) {
                ruleDescription = renderType(rule.type, rule.condition);
              }

              if (rule.action && Array.isArray(rule.action) && rule.action.length > 0) {
                const actionDescriptions = rule.action.map(action =>
                  renderType(action.type, action.condition)
                ).join(' and ');
                if (ruleDescription) {
                  ruleDescription += ` then ${actionDescriptions}`;
                } else {
                  ruleDescription = actionDescriptions;
                }
              }

              return (
                <Typography.Text key={rule.id} code className="block mt-3 text-sm">
                  {ruleDescription || 'Rule details incomplete'}
                </Typography.Text>
              );
            })
          ) : (
            <Typography.Text type="secondary">No rules found.</Typography.Text>
          )}

          {/* Rule Condition */}

          {/* Radio Control */}
          <div className="mt-4">
            <Radio.Group defaultValue="enabled">
              <Radio value="enabled">Enable automation on board</Radio>
              <Radio value="disabled">Disable automation on board</Radio>
            </Radio.Group>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulePage;

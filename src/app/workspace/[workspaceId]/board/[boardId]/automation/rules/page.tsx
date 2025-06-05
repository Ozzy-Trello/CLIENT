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
    // Extract the <filter> manually
    const filterMatch = type.match(/<([^>]+)>/);
    const filter = filterMatch ? filterMatch[1] : '';

    // Replace the placeholders except <filter>
    let result = type
      .replace(/_/g, ' ')
      .replace(/<action>/, condition?.action)
      .replace(/<by>/, condition?.by)
      .replace(/<board>/, condition?.board)
      .replace(/<filter>/, '') // remove placeholder
      .replace(/\s+/, ' ') // clean extra space left by removing <filter>
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
            automationRules.map((rule) => (
            <Typography.Text key={rule.id} code className="block mt-3 text-sm">
              {(rule.type && rule.condition) ? renderType(rule.type, rule.condition) : 'No type defined'}
            </Typography.Text>
            ))
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

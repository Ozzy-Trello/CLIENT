"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Spin, message } from 'antd';
import { Rule } from '@/app/dto/rules';
import RuleBuilder from './rule_builder';

const RulePage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  // Fetch the rule if editing an existing one
  useEffect(() => {
    if (id && id !== 'new') {
      // This is just for demonstration purposes
      setLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        // Example rule data
        const exampleRule: Rule = {
          id: id as string,
          triggers: [
            {
              id: 'trigger-1',
              templateId: 'card-moved-out-of-board',
              values: {
                memberId: 'user-1',
                cardFilter: ''
              }
            }
          ],
          actions: [
            {
              id: 'action-1',
              templateId: 'move-card-to-list',
              values: {
                listId: 'list-1'
              }
            }
          ],
          isActive: true
        };
        
        setRule(exampleRule);
        setLoading(false);
      }, 500);
    } else {
      setLoading(false);
    }
  }, [id]);

  // Handle saving the rule
  const handleSaveRule = async (ruleData: Rule) => {
    try {
      setLoading(true);
      
      console.log('Saving rule:', ruleData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      messageApi.success('Rule saved successfully!');
      router.push('/automation/rules');
    } catch (error) {
      messageApi.error('Failed to save rule');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-gray-50">
        <RuleBuilder 
          initialRule={rule || undefined} 
          onSave={handleSaveRule}
        />
      </div>
    </>
  );
}

export default RulePage;

"use client";
import React from 'react';
import { Button } from 'antd';
import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';

const AutomationContent: NextPage = () => {
  const router = useRouter();
  const { workspaceId, boardId } = useParams();

  // Navigate to the rule creation page
  const handleCreateRule = () => {
    router.push(`/workspace/${workspaceId}/board/${boardId}/automation/rule`);
  };

  return (
    <div className="p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Automation Rules</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Create a New Rule</h2>
          <p className="text-gray-600 mb-4">
            Automate your workflow by creating rules that trigger actions based on specific events.
          </p>
          <Button 
            type="primary" 
            onClick={handleCreateRule}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create Rule
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-medium mb-4">Your Existing Rules</h2>
          <div className="text-gray-500 italic">
            No rules created yet.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationContent;
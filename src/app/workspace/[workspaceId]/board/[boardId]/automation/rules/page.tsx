"use client";
import { Button, Typography } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import React, {  } from 'react';

const RulePage: React.FC = () => {

  const { workspaceId, boardId } = useParams();
  const router = useRouter();

  const toNewRulePage = () => {
    router.replace(`/workspace/${workspaceId}/board/${boardId}/automation/rules/new`);
  }

  return (
    <div className="min-h-screen">
      <div className='flex justify-between items-center pb-4 border-b border-gray-200'>
        <Typography.Title>Rules</Typography.Title>
        <Button color="default" size="small" onClick={toNewRulePage}>Create New Rule</Button>
      </div>
    </div>
  );
}

export default RulePage;

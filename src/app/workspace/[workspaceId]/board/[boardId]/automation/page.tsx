"use client";
import { useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

const AutomationContent: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If page is at the base automation URL, redirect to rules
    if (pathname === `/workspace/${workspaceId}/board/${boardId}/automation`) {
      router.replace(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
    }
  }, []);
  return null;
};

export default AutomationContent;
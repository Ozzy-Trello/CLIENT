"use client";
import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

const AutomationContent: React.FC = () => {
  const { workspaceId, boardId } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // If page is at the base automation URL, redirect to rules
    if (pathname === `/workspace/${workspaceId}/board/${boardId}/automation`) {
      router.replace(`/workspace/${workspaceId}/board/${boardId}/automation/rules`);
    }
  }, [isClient, pathname, workspaceId, boardId, router]);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return null;
};

export default AutomationContent;
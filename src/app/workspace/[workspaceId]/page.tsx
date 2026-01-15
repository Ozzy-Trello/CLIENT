"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const WorkspaceDetail: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId;

  useEffect(() => {
    if (workspaceId) {
      router.push(`/workspace/${workspaceId}/board`);
    }
  }, [workspaceId, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse">Redirecting to board...</div>
    </div>
  );
}

export default WorkspaceDetail;
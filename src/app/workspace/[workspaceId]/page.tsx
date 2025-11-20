"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentAccount } from "@hooks/account";
import { useWorkspaces } from "@hooks/workspace";
import { Card, Button, Typography, Skeleton } from "antd";
import { FolderKanban, Users, ShieldCheck } from "lucide-react";

const WorkspaceDetail: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : (params.workspaceId as string | undefined);

  const { workspaces, isLoading } = useWorkspaces();
  const currentWorkspace = useMemo(() => {
    return workspaces.find((ws) => ws.id === workspaceId);
  }, [workspaces, workspaceId]);

  const { data: accountData } = useCurrentAccount();
  const currentUser = accountData?.data;

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Card className="mb-8" bordered={false}>
        <div className="space-y-1">
          <Typography.Text type="secondary" className="uppercase text-xs">
            Workspace
          </Typography.Text>
          <Typography.Title level={3} className="mb-0">
            {currentWorkspace?.name || "Workspace"}
          </Typography.Title>
          <Typography.Text type="secondary">
            {currentWorkspace?.description ||
              "Manage boards, members, and permissions in this workspace."}
          </Typography.Text>
        </div>
      </Card>

      {currentUser && (
        <Card bordered={false} className="mt-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <Typography.Text type="secondary" className="uppercase text-xs">
                Signed in as
              </Typography.Text>
              <Typography.Title level={4} className="mb-0">
                {currentUser.username || currentUser.email}
              </Typography.Title>
              <Typography.Text type="secondary">
                {currentUser.role?.name || "Workspace member"}
              </Typography.Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WorkspaceDetail;

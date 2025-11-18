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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card bordered={false} className="shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-blue-50">
              <FolderKanban className="text-blue-500" size={20} />
            </div>
            <div>
              <Typography.Text strong>Boards</Typography.Text>
              <Typography.Text type="secondary" className="block text-xs">
                Access your boards and workflows
              </Typography.Text>
            </div>
          </div>
          <Button
            type="primary"
            block
            onClick={() =>
              router.push(`/workspace/${workspaceId}/board`)
            }
          >
            Open boards
          </Button>
        </Card>

        <Card bordered={false} className="shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-emerald-50">
              <Users className="text-emerald-500" size={20} />
            </div>
            <div>
              <Typography.Text strong>Members</Typography.Text>
              <Typography.Text type="secondary" className="block text-xs">
                Invite and manage workspace members
              </Typography.Text>
            </div>
          </div>
          <Button
            block
            onClick={() =>
              router.push(`/workspace/${workspaceId}/members`)
            }
          >
            Manage members
          </Button>
        </Card>

        <Card bordered={false} className="shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-full bg-purple-50">
              <ShieldCheck className="text-purple-500" size={20} />
            </div>
            <div>
              <Typography.Text strong>Roles & Permissions</Typography.Text>
              <Typography.Text type="secondary" className="block text-xs">
                Configure access levels for your team
              </Typography.Text>
            </div>
          </div>
          <Button
            block
            onClick={() =>
              router.push(`/workspace/${workspaceId}/roles`)
            }
          >
            View roles
          </Button>
        </Card>
      </div>

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

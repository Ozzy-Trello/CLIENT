"use client";

import { Typography } from "antd";
import { useParams } from "next/navigation";
import UnfinishedAccessories from "../unfinished-accessories";

export default function StatusAksesorisPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params?.workspaceId)
    ? params.workspaceId[0]
    : (params?.workspaceId as string | undefined);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Status Aksesoris
        </Typography.Title>
        <Typography.Text type="secondary">
          Daftar card dengan aksesoris yang belum selesai.
        </Typography.Text>
      </div>
      <UnfinishedAccessories workspaceId={workspaceId || ""} />
    </div>
  );
}

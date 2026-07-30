"use client";

import NotulensiDetailView from "@components/notulensi/notulensi-detail";
import { useNotulensiDetail } from "@hooks/notulensi";
import { useParams } from "next/navigation";

export default function NotulensiDetailPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";
  const detailQuery = useNotulensiDetail(workspaceId, id);

  return (
    <div className="p-4 md:p-6">
      <NotulensiDetailView
        workspaceId={workspaceId}
        detail={detailQuery.data?.data}
        loading={detailQuery.isLoading}
        error={detailQuery.isError}
        onRetry={() => detailQuery.refetch()}
      />
    </div>
  );
}

"use client";

import NotulensiForm from "@components/notulensi/notulensi-form";
import { useNotulensiDetail, useUpdateNotulensi } from "@hooks/notulensi";
import { UpdateNotulensiPayload } from "@myTypes/notulensi";
import { Result, Skeleton, Typography, message } from "antd";
import { AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      fallback
    );
  }
  return fallback;
};

export default function EditNotulensiPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const id = Array.isArray(params.id) ? params.id[0] : params.id || "";

  const detailQuery = useNotulensiDetail(workspaceId, id);
  const updateMutation = useUpdateNotulensi();

  if (detailQuery.isLoading) {
    return (
      <div className="p-4 md:p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data?.data) {
    return (
      <div className="p-4 md:p-6">
        <Result status="error" title="Instruction not available" />
      </div>
    );
  }

  const detail = detailQuery.data.data;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <Typography.Title level={2} className="!mb-1 !mt-0">
          Edit Notulensi
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="!mb-0">
          Update the instruction details.
        </Typography.Paragraph>
      </div>
      <NotulensiForm
        mode="edit"
        initialData={detail}
        canEdit={Boolean(detail.permissions?.canEdit)}
        submitting={updateMutation.isPending}
        cancelHref={`/workspace/${workspaceId}/notulensi/${id}`}
        onSubmit={async (payload) => {
          try {
            await updateMutation.mutateAsync({
              workspaceId,
              id,
              payload: payload as UpdateNotulensiPayload,
            });
            message.success("Instruction updated");
            router.replace(`/workspace/${workspaceId}/notulensi/${id}`);
          } catch (error) {
            message.error(getErrorMessage(error, "Failed to update instruction"));
          }
        }}
      />
    </div>
  );
}

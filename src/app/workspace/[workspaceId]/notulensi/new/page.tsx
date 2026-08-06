"use client";

import NotulensiForm from "@components/notulensi/notulensi-form";
import { uploadNotulensiAttachmentsSequentially } from "@components/notulensi/notulensi-detail-utils";
import { useCreateNotulensi, useUploadNotulensiAttachment } from "@hooks/notulensi";
import { CreateNotulensiPayload } from "@myTypes/notulensi";
import { message, Typography } from "antd";
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

export default function NewNotulensiPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const createMutation = useCreateNotulensi();
  const uploadAttachmentMutation = useUploadNotulensiAttachment();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <Typography.Title level={2} className="!mb-1 !mt-0">
          New Notulensi
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="!mb-0">
          Record a new instruction for this workspace.
        </Typography.Paragraph>
      </div>
      <NotulensiForm
        mode="create"
        submitting={createMutation.isPending || uploadAttachmentMutation.isPending}
        cancelHref={`/workspace/${workspaceId}/notulensi`}
        onSubmit={async (payload, queuedFiles = []) => {
          let id: string;
          try {
            const response = await createMutation.mutateAsync({
              workspaceId,
              payload: payload as CreateNotulensiPayload,
            });
            id = response.data.id;
          } catch (error) {
            message.error(getErrorMessage(error, "Failed to create instruction"));
            return;
          }

          const result = await uploadNotulensiAttachmentsSequentially(
            queuedFiles,
            (file) => uploadAttachmentMutation.mutateAsync({ workspaceId, id, file, invalidate: false }),
            () => undefined
          );

          if (result.failed) {
            message.error(
              `Instruction created; ${result.uploaded} of ${queuedFiles.length} attachments uploaded, ${result.failed} failed`
            );
          } else if (result.uploaded) {
            message.success(
              `Instruction created with ${result.uploaded} attachment${result.uploaded === 1 ? "" : "s"}`
            );
          } else {
            message.success("Instruction created");
          }
          router.replace(`/workspace/${workspaceId}/notulensi`);
        }}
      />
    </div>
  );
}

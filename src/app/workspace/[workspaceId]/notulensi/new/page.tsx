"use client";

import NotulensiForm from "@components/notulensi/notulensi-form";
import { replaceInlineImageUrls, uploadNotulensiAttachmentsSequentially } from "@components/notulensi/notulensi-detail-utils";
import { useCreateNotulensi, useUpdateNotulensi, useUploadNotulensiAttachment } from "@hooks/notulensi";
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
  const updateMutation = useUpdateNotulensi();

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
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
        submitting={createMutation.isPending || uploadAttachmentMutation.isPending || updateMutation.isPending}
        cancelHref={`/workspace/${workspaceId}/notulensi`}
        onSubmit={async (payload, queuedFiles = [], inlineImages = [], contentWithInlineImages = "") => {
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

          const inlineUrls = new Map<string, string>();
          let inlineFailed = 0;
          for (const image of inlineImages) {
            try {
              const response = await uploadAttachmentMutation.mutateAsync({
                workspaceId,
                id,
                file: image.file,
                invalidate: false,
              });
              if (!response.data.url) throw new Error("Upload did not return an image URL");
              inlineUrls.set(image.placeholderUrl, response.data.url);
            } catch {
              inlineFailed += 1;
              inlineUrls.set(image.placeholderUrl, "");
            }
          }

          if (inlineImages.length) {
            try {
              await updateMutation.mutateAsync({
                workspaceId,
                id,
                payload: { content: replaceInlineImageUrls(contentWithInlineImages, inlineUrls) },
              });
            } catch {
              inlineFailed += inlineImages.length - inlineFailed;
            }
          }

          if (result.failed || inlineFailed) {
            message.error(
              `Instruction created; ${result.failed} attachment upload${result.failed === 1 ? "" : "s"} and ${inlineFailed} inline image${inlineFailed === 1 ? "" : "s"} failed`
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

"use client";

import NotulensiForm from "@components/notulensi/notulensi-form";
import { useCreateNotulensi } from "@hooks/notulensi";
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
        submitting={createMutation.isPending}
        cancelHref={`/workspace/${workspaceId}/notulensi`}
        onSubmit={async (payload) => {
          try {
            const response = await createMutation.mutateAsync({
              workspaceId,
              payload: payload as CreateNotulensiPayload,
            });
            message.success("Instruction created");
            router.replace(`/workspace/${workspaceId}/notulensi/${response.data.id}`);
          } catch (error) {
            message.error(getErrorMessage(error, "Failed to create instruction"));
          }
        }}
      />
    </div>
  );
}

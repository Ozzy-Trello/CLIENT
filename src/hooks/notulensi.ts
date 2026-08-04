import {
  createNotulensi,
  createNotulensiComment,
  deleteNotulensi,
  deleteNotulensiAttachment,
  deleteNotulensiComment,
  deleteNotulensiPrivateNote,
  getNotulensiEligibleAssignees,
  getNotulensiDetail,
  getNotulensiList,
  getNotulensiPrivateNote,
  openNotulensi,
  runNotulensiAction,
  updateNotulensi,
  updateNotulensiComment,
  updateNotulensiPrivateNote,
  updateNotulensiProgress,
  uploadNotulensiAttachment,
} from "@api/notulensi";
import { queryKeys } from "@constants/query-keys";
import {
  CreateNotulensiPayload,
  NotulensiCommentPayload,
  NotulensiListFilters,
  NotulensiPrivateNotePayload,
  NotulensiProgress,
  NotulensiWorkflowAction,
  UpdateNotulensiPayload,
} from "@myTypes/notulensi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const invalidateWorkspaceNotulensi = async (
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  id?: string
) => {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.notulensi.workspace(workspaceId),
  });

  if (id) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.notulensi.detail(workspaceId, id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.notulensi.privateNote(workspaceId, id),
      }),
    ]);
  }
};

export function useNotulensiList(
  workspaceId: string,
  filters: NotulensiListFilters,
  enabled = true
) {
  return useQuery({
    queryKey: [...queryKeys.notulensi.workspace(workspaceId), "list", filters] as const,
    queryFn: () => getNotulensiList(workspaceId, filters),
    enabled: Boolean(workspaceId) && enabled,
  });
}

export function useNotulensiDetail(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.notulensi.detail(workspaceId, id),
    queryFn: async () => {
      try {
        return await openNotulensi(workspaceId, id);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          return getNotulensiDetail(workspaceId, id);
        }
        throw error;
      }
    },
    enabled: Boolean(workspaceId && id),
  });
}

export function useUploadNotulensiAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id, file }: { workspaceId: string; id: string; file: File; invalidate?: boolean }) =>
      uploadNotulensiAttachment(workspaceId, id, file),
    onSuccess: async (_, variables) => {
      if (variables.invalidate === false) return;
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useRefreshNotulensi() {
  const queryClient = useQueryClient();
  return (workspaceId: string) =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.notulensi.workspace(workspaceId),
    });
}

export function useDeleteNotulensiAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id, attachmentId }: { workspaceId: string; id: string; attachmentId: string }) =>
      deleteNotulensiAttachment(workspaceId, id, attachmentId),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useNotulensiPrivateNote(workspaceId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.notulensi.privateNote(workspaceId, id),
    queryFn: () => getNotulensiPrivateNote(workspaceId, id),
    enabled: Boolean(workspaceId && id),
  });
}

export function useCreateNotulensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, payload }: { workspaceId: string; payload: CreateNotulensiPayload }) =>
      createNotulensi(workspaceId, payload),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId);
    },
  });
}

export function useUpdateNotulensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      payload,
    }: {
      workspaceId: string;
      id: string;
      payload: UpdateNotulensiPayload;
    }) => updateNotulensi(workspaceId, id, payload),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useDeleteNotulensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, id }: { workspaceId: string; id: string }) =>
      deleteNotulensi(workspaceId, id),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId);
    },
  });
}

export function useNotulensiAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      action,
    }: {
      workspaceId: string;
      id: string;
      action: NotulensiWorkflowAction;
    }) => runNotulensiAction(workspaceId, id, action),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useUpdateNotulensiProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id, progress }: { workspaceId: string; id: string; progress: NotulensiProgress }) =>
      updateNotulensiProgress(workspaceId, id, progress),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useNotulensiEligibleAssignees(workspaceId: string) {
  return useQuery({
    queryKey: [...queryKeys.notulensi.workspace(workspaceId), "eligible-assignees"] as const,
    queryFn: () => getNotulensiEligibleAssignees(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateNotulensiComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      payload,
    }: {
      workspaceId: string;
      id: string;
      payload: NotulensiCommentPayload;
    }) => createNotulensiComment(workspaceId, id, payload),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useUpdateNotulensiComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      commentId,
      payload,
    }: {
      workspaceId: string;
      id: string;
      commentId: string;
      payload: NotulensiCommentPayload;
    }) => updateNotulensiComment(workspaceId, id, commentId, payload),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useDeleteNotulensiComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      commentId,
    }: {
      workspaceId: string;
      id: string;
      commentId: string;
    }) => deleteNotulensiComment(workspaceId, id, commentId),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useUpdateNotulensiPrivateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      payload,
    }: {
      workspaceId: string;
      id: string;
      payload: NotulensiPrivateNotePayload;
    }) => updateNotulensiPrivateNote(workspaceId, id, payload),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

export function useDeleteNotulensiPrivateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, id }: { workspaceId: string; id: string }) =>
      deleteNotulensiPrivateNote(workspaceId, id),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
  });
}

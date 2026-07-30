import {
  createNotulensi,
  createNotulensiComment,
  deleteNotulensi,
  deleteNotulensiComment,
  deleteNotulensiPrivateNote,
  getNotulensiDetail,
  getNotulensiList,
  getNotulensiPrivateNote,
  transitionNotulensiStatus,
  updateNotulensi,
  updateNotulensiComment,
  updateNotulensiPrivateNote,
} from "@api/notulensi";
import { queryKeys } from "@constants/query-keys";
import {
  CreateNotulensiPayload,
  NotulensiCommentPayload,
  NotulensiListFilters,
  NotulensiPrivateNotePayload,
  NotulensiStatus,
  UpdateNotulensiPayload,
} from "@myTypes/notulensi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    queryFn: () => getNotulensiDetail(workspaceId, id),
    enabled: Boolean(workspaceId && id),
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notulensi.workspace(variables.workspaceId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.notulensi.detail(variables.workspaceId, variables.id),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.notulensi.privateNote(variables.workspaceId, variables.id),
      });
    },
  });
}

export function useTransitionNotulensi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      id,
      status,
    }: {
      workspaceId: string;
      id: string;
      status: NotulensiStatus;
    }) => transitionNotulensiStatus(workspaceId, id, { status }),
    onSuccess: async (_, variables) => {
      await invalidateWorkspaceNotulensi(queryClient, variables.workspaceId, variables.id);
    },
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

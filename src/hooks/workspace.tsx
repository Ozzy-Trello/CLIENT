import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkspace,
  workspaces,
  workspaceDefault,
  CreateWorkspacePayload,
  updateWorkspace,
  UpdateWorkspacePayload,
} from "../api/workspace";
import TokenStorage from "@utils/token-storage";

export const useWorkspaces = () => {
  const queryClient = useQueryClient();
  const isClient = typeof window !== "undefined";

  const workspaceQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspaces,
    enabled: isClient,
    staleTime: 30000,
  });

  return {
    workspaces: workspaceQuery.data?.data || [],
    isLoading: workspaceQuery.isLoading,
    isError: workspaceQuery.isError,
    error: workspaceQuery.error,
  };
};

export const useDefaultWorkspace = () => {
  const queryClient = useQueryClient();
  const isClient = typeof window !== "undefined";
  const accessToken = isClient ? TokenStorage.getAccessToken() : null;

  // Hardcoded default workspace
  const defaultWorkspace = {
    id: "eb65c15c-12cc-49e4-9827-16ef1c838c4d",
    name: "Ozzy Production",
    description: "Default workspace for Ozzy Clothing",
    slug: "ozzy-production",
  };

  return {
    defaultWorkspace: accessToken ? defaultWorkspace : null,
    isLoading: false,
    isError: false,
    error: null,
  };
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => createWorkspace(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      payload,
    }: {
      workspaceId: string;
      payload: UpdateWorkspacePayload;
    }) => updateWorkspace(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

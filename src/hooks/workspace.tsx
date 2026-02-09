import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaces, workspaceDefault } from "../api/workspace";
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
  const isClient = typeof window !== "undefined";
  const accessToken = isClient ? TokenStorage.getAccessToken() : null;

  const defaultWorkspaceQuery = useQuery({
    queryKey: ["defaultWorkspace"],
    queryFn: workspaceDefault,
    enabled: isClient && !!accessToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    defaultWorkspace: defaultWorkspaceQuery.data?.data || null,
    isLoading: defaultWorkspaceQuery.isLoading,
    isError: defaultWorkspaceQuery.isError,
    error: defaultWorkspaceQuery.error,
  };
};

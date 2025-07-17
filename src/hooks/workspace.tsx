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

  console.log("useDefaultWorkspace debug:", {
    isClient,
    hasAccessToken: !!accessToken,
    defaultWorkspace: defaultWorkspace.id,
  });

  return {
    defaultWorkspace: accessToken ? defaultWorkspace : null,
    isLoading: false,
    isError: false,
    error: null,
  };
};

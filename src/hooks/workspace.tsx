import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaces } from "../api/workspace";

export const useWorkspaces = () => {

  const queryClient = useQueryClient();

  const workspaceQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspaces,
    enabled: true,
    staleTime: 30000
  });

  return {
    workspaces: workspaceQuery.data?.data || [],
    isLoading: workspaceQuery.isLoading,
    isError: workspaceQuery.isError,
    error: workspaceQuery.error
  }
}
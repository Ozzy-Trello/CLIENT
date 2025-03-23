import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceDefault, workspaceDetails, workspaces } from "../api/workspace";

export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: workspaces
  });
}

export const useWorkspaceDefault = () => {
  const workspaceClient = useQueryClient();

  return useMutation({
    mutationFn: workspaceDefault,
    onSuccess: (data) => {
      workspaceClient.invalidateQueries({queryKey: ["workspaceDefault"]});
    }
  })
}

export const useWorkspaceDetails = () => {
  const workspaceClient = useQueryClient();

  return useMutation({
    mutationFn: workspaceDetails,
    onSuccess: (data) => {
      workspaceClient.invalidateQueries({queryKey: ["workspaceDetails"]})
    }
  })
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSessions, revokeSession, revokeAllSessionsForUser } from "@api/admin_sessions";

export function useAdminSessions(params: {
  active?: boolean;
  userId?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["admin-sessions", params],
    queryFn: () => listSessions(params).then((r) => r.data),
    refetchInterval: 15_000,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-sessions"] }),
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAllSessionsForUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-sessions"] }),
  });
}

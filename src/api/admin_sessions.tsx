import api from "@api/index";

export interface SessionRow {
  id: string;
  user_id: string;
  ip_address: string | null;
  device_type: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  geo_country: string | null;
  geo_city: string | null;
  remember_me: boolean;
  last_seen_at: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
}

export function listSessions(params: {
  active?: boolean;
  userId?: string;
  page?: number;
}) {
  return api.get<{ data: SessionRow[]; total: number }>("/admin/sessions", {
    params: {
      active: params.active,
      userId: params.userId,
      page: params.page ?? 1,
    },
  });
}

export function revokeSession(sessionId: string) {
  return api.post(`/admin/sessions/${sessionId}/revoke`);
}

export function revokeAllSessionsForUser(userId: string) {
  return api.post(`/admin/users/${userId}/sessions/revoke-all`);
}

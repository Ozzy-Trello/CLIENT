import api from "@api/index";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
}

export interface SessionRow {
  id: string;
  userId: string;
  user?: SessionUser | null;
  ipAddress: string | null;
  deviceType: string | null;
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  rememberMe: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
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

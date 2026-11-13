export type DailyActivityStatus = "draft" | "submitted" | "missing" | "not_required" | "on_leave";
export type DailyActivityTab = "mine" | "team" | "leave" | "settings" | "structure" | "calendar";

export interface DailyActivityReference {
  id: string;
  reference_type: "file" | "link" | "card" | "notulensi";
  file_id?: string | null;
  url?: string | null;
  display_text?: string | null;
  card_id?: string | null;
  notulensi_id?: string | null;
  file_url?: string | null;
  file_mime_type?: string | null;
  card?: {
    id: string;
    name: string;
    list?: {
      id: string;
      board?: { id: string; workspace_id?: string; workspaceId?: string } | null;
    } | null;
  } | null;
  notulensi?: { id: string; workspace_id: string; code: string; title: string } | null;
}

export interface DailyActivityItem {
  id: string;
  content: string;
  order: number;
  comments_count?: number;
  references?: DailyActivityReference[];
}

export interface DailyActivityReport {
  id: string;
  user_id: string;
  work_date: string;
  status: "draft" | "submitted";
  first_submitted_at: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  can_review?: boolean;
  review_required?: boolean;
  activities: DailyActivityItem[];
  history?: Array<{ action: string; snapshot: unknown; created_at: string }>;
}

export interface DailyActivityDay {
  user_id: string;
  username: string;
  role_name: string | null;
  work_date: string;
  required: boolean;
  status: DailyActivityStatus;
  report_id: string | null;
  leave?: { start_date: string; end_date: string; note?: string | null } | null;
  submitted_at?: string | null;
  deadline_time?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  can_review?: boolean;
  review_required?: boolean;
  activities: Array<{ id: string; content: string; references: DailyActivityReference[] }>;
}

export type DailyActivityLeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface DailyActivityLeaveRequest {
  id: string;
  user_id: string;
  employee_name: string;
  employee_role_name: string | null;
  approver_role_id: string | null;
  approver_role_name: string | null;
  start_date: string;
  end_date: string;
  total_days?: number;
  note: string | null;
  status: DailyActivityLeaveStatus;
  decision_note: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface DailyActivityAccessStatus {
  locked: boolean;
  missed_dates: string[];
  oldest_missed_date: string | null;
  unread_comment_count?: number;
  oldest_unread_comment?: { comment_id: string; report_id: string; item_id: string; work_date: string; owner_id: string } | null;
  pending_review_count?: number;
  oldest_pending_review?: { report_id: string; work_date: string; user_id: string } | null;
}

export interface DailyActivityComment {
  id: string;
  item_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: DailyActivityUser | null;
}

export interface DailyActivityUser {
  id: string;
  username: string;
  role_id: string | null;
  role_name?: string | null;
}

export interface DailyActivityStructureRole {
  id: string;
  name: string;
  manager_role_id: string | null;
  members: DailyActivityUser[];
}

export interface DailyActivityConfiguration {
  roles: Array<{ id: string; name: string; manager_role_id: string | null }>;
  users: DailyActivityUser[];
  reviewers: Array<{
    user_id: string;
    username: string;
    role_id: string | null;
    role_name: string | null;
    is_required: boolean;
    scope_configured: boolean;
    direct_subordinate_ids: string[];
    subordinate_ids: string[];
  }>;
  role_rules: Array<{ id: string; role_id: string; is_required: boolean; effective_from: string }>;
  user_overrides: Array<{ id: string; user_id: string; rule: "follow_role" | "required" | "exempt"; effective_from: string }>;
  settings: Array<{ id: number; deadline_time: string; effective_from: string }>;
  holidays: Array<{ id: string; holiday_date: string; name: string }>;
}

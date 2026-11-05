export type DailyActivityStatus = "draft" | "submitted" | "missing" | "not_required";
export type DailyActivityTab = "mine" | "team" | "settings" | "structure" | "calendar";

export interface DailyActivityReference {
  id: string;
  reference_type: "file" | "link" | "card";
  file_id?: string | null;
  url?: string | null;
  display_text?: string | null;
  card_id?: string | null;
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
}

export interface DailyActivityItem {
  id: string;
  content: string;
  order: number;
  references?: DailyActivityReference[];
}

export interface DailyActivityReport {
  id: string;
  user_id: string;
  work_date: string;
  status: "draft" | "submitted";
  first_submitted_at: string | null;
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
  submitted_at?: string | null;
  deadline_time?: string;
  activities: Array<{ id: string; content: string; references: DailyActivityReference[] }>;
}

export interface DailyActivityAccessStatus {
  locked: boolean;
  missed_dates: string[];
  oldest_missed_date: string | null;
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
  role_rules: Array<{ id: string; role_id: string; is_required: boolean; effective_from: string }>;
  user_overrides: Array<{ id: string; user_id: string; rule: "follow_role" | "required" | "exempt"; effective_from: string }>;
  settings: Array<{ id: number; deadline_time: string; effective_from: string }>;
  holidays: Array<{ id: string; holiday_date: string; name: string }>;
}

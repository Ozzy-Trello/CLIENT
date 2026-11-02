export type DailyActivityStatus = "draft" | "submitted" | "missing" | "not_required";
export type DailyActivityTab = "mine" | "team" | "settings" | "structure" | "calendar";

export interface DailyActivityReference {
  id: string;
  reference_type: "file" | "link" | "card";
  file_id?: string | null;
  url?: string | null;
  display_text?: string | null;
  card_id?: string | null;
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
}

export interface DailyActivityDay {
  user_id: string;
  username: string;
  role_name: string | null;
  work_date: string;
  required: boolean;
  status: DailyActivityStatus;
  report_id: string | null;
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
  manager_id: string | null;
}

export interface DailyActivityConfiguration {
  roles: Array<{ id: string; name: string }>;
  role_rules: Array<{ id: string; role_id: string; is_required: boolean; effective_from: string }>;
  user_overrides: Array<{ id: string; user_id: string; rule: "follow_role" | "required" | "exempt"; effective_from: string }>;
  settings: Array<{ id: number; deadline_time: string; effective_from: string }>;
  holidays: Array<{ id: string; holiday_date: string; name: string }>;
}

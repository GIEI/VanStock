export interface AppNotification {
  id:         number;
  company_id: number;
  user_id:    number;
  type:       string | null;
  title:      string;
  body:       string | null;
  url:        string | null;
  data:       Record<string, unknown> | null;
  read_at:    string | null;
  created_at: string;
}

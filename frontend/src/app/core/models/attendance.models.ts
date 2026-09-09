export type AttendanceState = 'OUT' | 'IN' | 'BREAK' | 'PENDING_REVIEW' | 'LOCKED';
export type AttendanceAction = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
export type EventStatus = 'valid' | 'invalid' | 'reviewed' | 'superseded';
export type EventSource = 'mobile' | 'web' | 'admin';

export interface AttendanceEvent {
  id: number;
  company_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  occurred_at: string;
  detected_action: AttendanceAction;
  resulting_state: AttendanceState;
  previous_state: AttendanceState;
  request_id: string;
  qr_token_id?: string;
  device_id?: string;
  gps_lat?: number;
  gps_lng?: number;
  source: EventSource;
  status: EventStatus;
  anomaly_type?: string;
  anomaly_dismissed?: boolean;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface AttendanceDay {
  user_id: number;
  user_name?: string;
  company_id: number;
  date: string;
  first_entry?: string;
  last_exit?: string;
  worked_minutes: number;
  break_minutes: number;
  anomalies_count: number;
  has_pending_review: boolean;
  status: 'open' | 'closed' | 'anomalous';
}

export interface AttendanceOverrideRequest {
  id: number;
  company_id: number;
  user_id: number;
  user_name?: string;
  requested_action: AttendanceAction;
  requested_at: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  resulting_event_id?: number;
  created_at: string;
}

export interface AttendanceAuditEntry {
  id: number;
  attendance_event_id?: number;
  admin_id: number;
  admin_name?: string;
  action: 'CREATE' | 'UPDATE' | 'SUPERSEDE' | 'RESOLVE_ANOMALY' | 'DISMISS_ANOMALY' | 'APPROVE_REQUEST' | 'REJECT_REQUEST' | 'INVALIDATE';
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  reason: string;
  created_at: string;
}

export interface CreateEventBody {
  user_id: number;
  occurred_at: string;
  detected_action: AttendanceAction;
  reason: string;
  notes?: string;
}

export interface UpdateEventBody {
  occurred_at?: string;
  detected_action?: AttendanceAction;
  notes?: string;
  reason: string;
}

export interface ReviewRequestBody {
  decision: 'approve' | 'reject';
  review_notes: string;
}

export interface EventsFilters {
  user_id?: number;
  date_from?: string;
  date_to?: string;
  status?: EventStatus;
  anomaly_only?: boolean;
}

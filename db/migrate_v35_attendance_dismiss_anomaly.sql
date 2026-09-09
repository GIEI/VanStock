-- Add 'DISMISS_ANOMALY' to the allowed action values in attendance_audit_log
ALTER TABLE attendance_audit_log
DROP CONSTRAINT IF EXISTS attendance_audit_log_action_check;

ALTER TABLE attendance_audit_log
ADD CONSTRAINT attendance_audit_log_action_check
CHECK (action IN ('CREATE', 'UPDATE', 'SUPERSEDE', 'RESOLVE_ANOMALY', 'DISMISS_ANOMALY', 'APPROVE_REQUEST', 'REJECT_REQUEST', 'INVALIDATE'));

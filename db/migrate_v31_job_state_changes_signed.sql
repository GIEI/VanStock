-- Add 'signed' to the allowed change_type values in job_state_changes
ALTER TABLE job_state_changes
DROP CONSTRAINT IF EXISTS job_state_changes_change_type_check;

ALTER TABLE job_state_changes
ADD CONSTRAINT job_state_changes_change_type_check
CHECK (change_type IN ('accept', 'arrived', 'completed', 'rejected', 'signed'));

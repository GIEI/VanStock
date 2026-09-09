-- Migration v14: Job Signature and PDF Report
-- Added support for digital signature and PDF report generation for intervention reports.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS customer_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS report_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

-- Add index for search/sorting
CREATE INDEX IF NOT EXISTS idx_jobs_signed_at ON jobs (signed_at DESC) WHERE signed_at IS NOT NULL;

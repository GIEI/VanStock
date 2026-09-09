-- Migration v19: per-company Word template for PDF reports
ALTER TABLE companies ADD COLUMN IF NOT EXISTS word_template_url TEXT;

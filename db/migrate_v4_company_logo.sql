-- Migration v4: company logo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- v29: media_type discriminator on job_photos (image|video).
--
-- Powers per-plan upload limits enforced by backend/src/services/media-limits.js.
-- Existing rows are backfilled by inspecting filename extension.

ALTER TABLE job_photos
  ADD COLUMN IF NOT EXISTS media_type VARCHAR(8) NOT NULL DEFAULT 'image';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_photos_media_type_check') THEN
    ALTER TABLE job_photos
      ADD CONSTRAINT job_photos_media_type_check
      CHECK (media_type IN ('image','video'));
  END IF;
END $$;

UPDATE job_photos
SET media_type = 'video'
WHERE filename ~* '\.(mp4|webm|mov|mkv|3gp)$' AND media_type <> 'video';

CREATE INDEX IF NOT EXISTS idx_job_photos_job_type_media
  ON job_photos(job_id, type, media_type);

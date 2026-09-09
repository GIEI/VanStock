-- Add geolocation columns to job_photos table
ALTER TABLE IF EXISTS job_photos
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_address VARCHAR(500);

-- Create index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_job_photos_location 
  ON job_photos (latitude, longitude) 
  WHERE latitude IS NOT NULL;

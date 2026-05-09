CREATE TABLE IF NOT EXISTS tires (
  id SERIAL PRIMARY KEY,
  tire_code VARCHAR(100),
  brand VARCHAR(100) NOT NULL,
  pattern VARCHAR(100) NOT NULL,
  size_standard VARCHAR(20) NOT NULL,
  load_index VARCHAR(10),
  speed_rating VARCHAR(10),
  price INTEGER,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tires
ADD COLUMN IF NOT EXISTS tire_code VARCHAR(100);

UPDATE tires
SET tire_code = UPPER(
  REGEXP_REPLACE(
    COALESCE(brand, '') || '-' || COALESCE(pattern, '') || '-' || COALESCE(size_standard, ''),
    '[^A-Za-z0-9]+',
    '-',
    'g'
  )
)
WHERE tire_code IS NULL;

ALTER TABLE tires
ALTER COLUMN tire_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tires_tire_code
ON tires(tire_code);

CREATE INDEX IF NOT EXISTS idx_tires_size_standard
ON tires(size_standard);

CREATE INDEX IF NOT EXISTS idx_tires_active_size
ON tires(is_active, size_standard);

CREATE TABLE IF NOT EXISTS business_hours (
  id SERIAL PRIMARY KEY,
  service_key VARCHAR(50) NOT NULL,
  label VARCHAR(50) NOT NULL,
  hours_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_hours_service_key
ON business_hours(service_key);

CREATE INDEX IF NOT EXISTS idx_business_hours_active_order
ON business_hours(is_active, sort_order);

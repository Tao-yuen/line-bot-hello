CREATE TABLE IF NOT EXISTS tires (
  id SERIAL PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_tires_size_standard
ON tires(size_standard);

CREATE INDEX IF NOT EXISTS idx_tires_active_size
ON tires(is_active, size_standard);

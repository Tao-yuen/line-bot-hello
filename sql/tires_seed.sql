INSERT INTO tires
  (tire_code, brand, pattern, size_standard, load_index, speed_rating, price, image_url)
VALUES
  ('MICHELIN-PRIMACY-4-205-55R16', 'MICHELIN', 'Primacy 4', '205/55R16', '91', 'V', 3600, 'https://placehold.co/1200x780/png?text=Michelin+Primacy+4'),
  ('BRIDGESTONE-TURANZA-T005A-205-55R16', 'BRIDGESTONE', 'Turanza T005A', '205/55R16', '91', 'V', 3400, 'https://placehold.co/1200x780/png?text=Bridgestone+T005A'),
  ('MAXXIS-HP5-205-55R16', 'MAXXIS', 'HP5', '205/55R16', '91', 'V', 2600, 'https://placehold.co/1200x780/png?text=Maxxis+HP5'),
  ('CONTINENTAL-ULTRACONTACT-UC7-205-55R16', 'CONTINENTAL', 'UltraContact UC7', '205/55R16', '91', 'V', 3300, 'https://placehold.co/1200x780/png?text=Continental+UC7'),
  ('YOKOHAMA-AE51-205-55R16', 'YOKOHAMA', 'AE51', '205/55R16', '91', 'V', 3000, 'https://placehold.co/1200x780/png?text=Yokohama+AE51')
ON CONFLICT (tire_code) DO UPDATE SET
  brand = EXCLUDED.brand,
  pattern = EXCLUDED.pattern,
  size_standard = EXCLUDED.size_standard,
  load_index = EXCLUDED.load_index,
  speed_rating = EXCLUDED.speed_rating,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO business_hours
  (service_key, label, hours_text, sort_order, is_active)
VALUES
  ('maintenance', '保養廠', '保養廠營業時間：週一至週六 09:00-18:00', 10, true),
  ('car_wash', '洗車廠', '洗車廠營業時間：週一至週日 08:00-19:00', 20, true),
  ('inspection', '驗車廠', '驗車廠營業時間：週一至週五 08:30-17:30', 30, true)
ON CONFLICT (service_key) DO UPDATE SET
  label = EXCLUDED.label,
  hours_text = EXCLUDED.hours_text,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

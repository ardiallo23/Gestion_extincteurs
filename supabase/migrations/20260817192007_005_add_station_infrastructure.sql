-- Add infrastructure fields to stations
ALTER TABLE stations
  ADD COLUMN track_islands int NOT NULL DEFAULT 0,
  ADD COLUMN has_service_bay boolean NOT NULL DEFAULT false,
  ADD COLUMN has_wash_bay boolean NOT NULL DEFAULT false,
  ADD COLUMN has_shop boolean NOT NULL DEFAULT false,
  ADD COLUMN electrical_cabinets int NOT NULL DEFAULT 0,
  ADD COLUMN has_depotting_zone boolean NOT NULL DEFAULT false,
  ADD COLUMN has_generator_room boolean NOT NULL DEFAULT false;

-- Seed realistic values for demo stations
UPDATE stations SET
  track_islands = 4,
  has_service_bay = true,
  has_wash_bay = true,
  has_shop = true,
  electrical_cabinets = 3,
  has_depotting_zone = true,
  has_generator_room = true
WHERE name = 'Station Nord';

UPDATE stations SET
  track_islands = 6,
  has_service_bay = true,
  has_wash_bay = true,
  has_shop = true,
  electrical_cabinets = 5,
  has_depotting_zone = true,
  has_generator_room = true
WHERE name = 'Station Sud';

UPDATE stations SET
  track_islands = 3,
  has_service_bay = true,
  has_wash_bay = false,
  has_shop = false,
  electrical_cabinets = 2,
  has_depotting_zone = true,
  has_generator_room = true
WHERE name = 'Station Est';

UPDATE stations SET
  track_islands = 5,
  has_service_bay = true,
  has_wash_bay = true,
  has_shop = true,
  electrical_cabinets = 4,
  has_depotting_zone = false,
  has_generator_room = true
WHERE name = 'Station Ouest';

UPDATE stations SET
  track_islands = 8,
  has_service_bay = true,
  has_wash_bay = true,
  has_shop = true,
  electrical_cabinets = 6,
  has_depotting_zone = true,
  has_generator_room = true
WHERE name = 'Station Centrale';
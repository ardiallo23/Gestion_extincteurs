-- Add station code column
ALTER TABLE stations ADD COLUMN IF NOT EXISTS code text;

-- Set codes for existing stations
UPDATE stations SET code = 'ST-001' WHERE name = 'Station Nord';
UPDATE stations SET code = 'ST-002' WHERE name = 'Station Sud';
UPDATE stations SET code = 'ST-003' WHERE name = 'Station Est';
UPDATE stations SET code = 'ST-004' WHERE name = 'Station Ouest';
UPDATE stations SET code = 'ST-005' WHERE name = 'Station Centrale';

-- Backfill any missing codes before enforcing NOT NULL
UPDATE stations SET code = 'ST-' || lpad(id::text, 3, '0') WHERE code IS NULL;

-- Make code mandatory and unique
ALTER TABLE stations ALTER COLUMN code SET NOT NULL;
ALTER TABLE stations ADD CONSTRAINT stations_code_key UNIQUE (code);

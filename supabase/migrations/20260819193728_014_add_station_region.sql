/*
# Add region column to stations

1. Changes
- Add `region` column to the `stations` table.
- Type: text, nullable (existing rows keep NULL).
- Allowed values: 'MG', 'BG', 'GF', 'HG', 'Conakry'.
- A CHECK constraint enforces the allowed values at the database level.
2. Security
- No RLS policy changes. Existing policies remain in effect.
3. Notes
- The column is nullable so existing station rows are not rejected.
- The frontend will provide a dropdown restricted to the five allowed values.
*/

ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS region text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stations_region_check'
  ) THEN
    ALTER TABLE stations
      ADD CONSTRAINT stations_region_check
      CHECK (region IS NULL OR region IN ('MG', 'BG', 'GF', 'HG', 'Conakry'));
  END IF;
END $$;

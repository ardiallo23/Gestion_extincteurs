/*
# Add CDS column to stations and create cds_persons table

1. Changes to existing tables
- `stations`: add `cds` (text, nullable). Stores the name of the person
  responsible for sales monitoring ("CDS") for this station.

2. New Tables
- `cds_persons`
  - `id` (uuid, primary key)
  - `name` (text, not null) — display name of the CDS person
  - `created_at` (timestamptz, default now())
  - Unique constraint on `name` to prevent duplicates.

3. Security
- Enable RLS on `cds_persons`.
- All authenticated users can read the list (needed for the station form dropdown).
- Only admins can insert / update / delete CDS persons. Admin check is done
  via the `profiles` table: the requesting user must have role = 'admin'.

4. Notes
- The `stations.cds` column is nullable so existing rows are unaffected.
- It stores the person's name (text), matching the `cds_persons.name` values.
*/

ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS cds text;

CREATE TABLE IF NOT EXISTS cds_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cds_persons ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read the list of CDS persons (for the dropdown)
DROP POLICY IF EXISTS "authenticated_read_cds_persons" ON cds_persons;
CREATE POLICY "authenticated_read_cds_persons"
ON cds_persons FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
DROP POLICY IF EXISTS "admin_insert_cds_persons" ON cds_persons;
CREATE POLICY "admin_insert_cds_persons"
ON cds_persons FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can update
DROP POLICY IF EXISTS "admin_update_cds_persons" ON cds_persons;
CREATE POLICY "admin_update_cds_persons"
ON cds_persons FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can delete
DROP POLICY IF EXISTS "admin_delete_cds_persons" ON cds_persons;
CREATE POLICY "admin_delete_cds_persons"
ON cds_persons FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

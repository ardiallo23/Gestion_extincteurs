/*
# Add technician role (read-only compliance viewer)

## Changes
1. Expand the role CHECK constraint on profiles to include 'technician'.
   Technicians can only view compliance reports — no data modification.
2. No new RLS policies needed: the station_compliance view runs as owner
   (security_invoker=false) so any authenticated user can SELECT it.
   Existing SELECT policies on extinguishers/stations already allow
   any authenticated user with get_my_role() = 'technician' to read
   (ext_admin_or_station_select allows admin OR station match —
   technician won't match either, but they don't need raw table access,
   only the view which bypasses RLS).
3. Add explicit SELECT grant policy for technicians on extinguishers
   and stations so they can also browse the read-only compliance page
   which may join underlying tables.
*/

-- Step 1: Expand role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','manager','technician'));

-- Step 2: Allow technicians to read extinguishers (all stations, read-only)
DROP POLICY IF EXISTS "ext_technician_select" ON extinguishers;
CREATE POLICY "ext_technician_select"
ON extinguishers FOR SELECT
TO authenticated
USING (get_my_role() = 'technician');

-- Step 3: Allow technicians to read stations (all, read-only)
DROP POLICY IF EXISTS "stations_technician_select" ON stations;
CREATE POLICY "stations_technician_select"
ON stations FOR SELECT
TO authenticated
USING (get_my_role() = 'technician');

-- Step 4: Allow technicians to read daily_checks (all, read-only)
DROP POLICY IF EXISTS "checks_technician_select" ON daily_checks;
CREATE POLICY "checks_technician_select"
ON daily_checks FOR SELECT
TO authenticated
USING (get_my_role() = 'technician');

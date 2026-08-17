-- Fix infinite recursion in profiles RLS policies.
-- The old policies queried `profiles` inside profiles policies, causing recursion.
-- Solution: a SECURITY DEFINER function that reads the caller's role/station_id
-- without going through RLS, then use it in all policies.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_station_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id FROM profiles WHERE id = auth.uid();
$$;

-- ============ REPLACE PROFILES POLICIES ============
DROP POLICY IF EXISTS "profile_self_or_admin_select" ON profiles;
CREATE POLICY "profile_self_or_admin_select" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "profile_self_update" ON profiles;
CREATE POLICY "profile_self_update" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_my_role()
    AND station_id IS NOT DISTINCT FROM public.get_my_station_id()
  );

DROP POLICY IF EXISTS "profile_admin_update" ON profiles;
CREATE POLICY "profile_admin_update" ON profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profile_admin_insert" ON profiles;
CREATE POLICY "profile_admin_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "profile_admin_delete" ON profiles;
CREATE POLICY "profile_admin_delete" ON profiles FOR DELETE
  TO authenticated USING (public.get_my_role() = 'admin');

-- ============ REPLACE STATIONS POLICIES ============
DROP POLICY IF EXISTS "stations_admin_or_own_select" ON stations;
CREATE POLICY "stations_admin_or_own_select" ON stations FOR SELECT
  TO authenticated USING (
    public.get_my_role() = 'admin'
    OR id = public.get_my_station_id()
  );

DROP POLICY IF EXISTS "stations_admin_insert" ON stations;
CREATE POLICY "stations_admin_insert" ON stations FOR INSERT
  TO authenticated WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "stations_admin_update" ON stations;
CREATE POLICY "stations_admin_update" ON stations FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "stations_admin_delete" ON stations;
CREATE POLICY "stations_admin_delete" ON stations FOR DELETE
  TO authenticated USING (public.get_my_role() = 'admin');

-- ============ REPLACE EXTINGUISHERS POLICIES ============
DROP POLICY IF EXISTS "ext_admin_or_station_select" ON extinguishers;
CREATE POLICY "ext_admin_or_station_select" ON extinguishers FOR SELECT
  TO authenticated USING (
    public.get_my_role() = 'admin'
    OR station_id = public.get_my_station_id()
  );

DROP POLICY IF EXISTS "ext_admin_insert" ON extinguishers;
CREATE POLICY "ext_admin_insert" ON extinguishers FOR INSERT
  TO authenticated WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "ext_admin_update" ON extinguishers;
CREATE POLICY "ext_admin_update" ON extinguishers FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "ext_admin_delete" ON extinguishers;
CREATE POLICY "ext_admin_delete" ON extinguishers FOR DELETE
  TO authenticated USING (public.get_my_role() = 'admin');

-- ============ REPLACE DAILY CHECKS POLICIES ============
DROP POLICY IF EXISTS "checks_admin_or_station_select" ON daily_checks;
CREATE POLICY "checks_admin_or_station_select" ON daily_checks FOR SELECT
  TO authenticated USING (
    public.get_my_role() = 'admin'
    OR station_id = public.get_my_station_id()
  );

DROP POLICY IF EXISTS "checks_station_insert" ON daily_checks;
CREATE POLICY "checks_station_insert" ON daily_checks FOR INSERT
  TO authenticated WITH CHECK (
    station_id = public.get_my_station_id()
    AND public.get_my_role() = 'manager'
  );

DROP POLICY IF EXISTS "checks_station_update" ON daily_checks;
CREATE POLICY "checks_station_update" ON daily_checks FOR UPDATE
  TO authenticated
  USING (station_id = public.get_my_station_id())
  WITH CHECK (station_id = public.get_my_station_id());

DROP POLICY IF EXISTS "checks_admin_delete" ON daily_checks;
CREATE POLICY "checks_admin_delete" ON daily_checks FOR DELETE
  TO authenticated USING (public.get_my_role() = 'admin');

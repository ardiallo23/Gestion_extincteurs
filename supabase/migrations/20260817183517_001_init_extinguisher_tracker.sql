/*
# Fire Extinguisher Tracker — Initial Schema

## Overview
Centralized tracking of fire extinguishers across a network of gas stations.
Two roles: admins (headquarters, global view) and managers (station-scoped, daily check entry).

## Tables

### stations
- `id` (uuid, PK)
- `name` (text, not null)
- `address` (text)
- `city` (text)
- `created_at` (timestamptz)

### profiles
- `id` (uuid, PK, references auth.users) — 1:1 with auth user
- `email` (text, not null)
- `full_name` (text)
- `role` (text) — 'admin' or 'manager'
- `station_id` (uuid, references stations) — null for admins, required for managers
- `created_at` (timestamptz)

### extinguishers
- `id` (uuid, PK)
- `station_id` (uuid, references stations, ON DELETE CASCADE)
- `label` (text, not null) — e.g. "Extincteur A1"
- `type` (text) — e.g. "CO2", "Poudre", "Eau"
- `location` (text) — where it is installed in the station
- `serial_number` (text)
- `capacity` (text) — e.g. "6kg"
- `install_date` (date)
- `last_inspection_date` (date) — last regulatory inspection
- `next_inspection_date` (date) — next due regulatory inspection
- `active` (boolean, default true)
- `created_at` (timestamptz)

### daily_checks
- `id` (uuid, PK)
- `extinguisher_id` (uuid, references extinguishers, ON DELETE CASCADE)
- `station_id` (uuid, references stations) — denormalized for fast station-scoped queries
- `check_date` (date, not null)
- `status` (text, not null) — 'good' or 'defective'
- `pressure_ok` (boolean, not null)
- `seal_ok` (boolean, not null)
- `accessible` (boolean, not null)
- `last_inspection_date` (date) — as reported by manager on that day
- `comment` (text)
- `created_by` (uuid, references auth.users)
- `created_at` (timestamptz)
- UNIQUE(extinguisher_id, check_date) — one check per extinguisher per day

### stations_reporting_status (view)
Per-station rollup: total extinguishers, today's checks, missing checks, defective count,
overdue/upcoming regulatory inspections.

## Functions
- `extinguisher_status_for_date(p_ext_id uuid, p_date date)` — returns 'good', 'defective', or 'missing'.
- `station_reporting_for_date(p_station_id uuid, p_date date)` — returns station summary for a date.

## Security (RLS)
- profiles: each user reads/updates own row; admins read/update/insert/delete all.
- stations: admins full CRUD; managers read assigned station only.
- extinguishers: admins full CRUD; managers read own station's, no write.
- daily_checks: admins read all + delete; managers read/insert/update own station's.
- All policies scoped to authenticated role. No anon access (sign-in required app).

## Notes
1. Sign-in required app — all policies are `TO authenticated`.
2. Tables created first (to resolve circular FK/policy references), policies added after.
3. `daily_checks.station_id` denormalized for efficient station filtering.
4. Unique constraint prevents duplicate daily entries per extinguisher per day.
5. SECURITY DEFINER functions use `SET search_path = public` for safety.
6. Trigger auto-creates a manager profile on signup; admins promote via profile update.
*/

-- ============ TABLES (created before policies) ============
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('admin','manager')),
  station_id uuid REFERENCES stations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extinguishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  label text NOT NULL,
  type text,
  location text,
  serial_number text,
  capacity text,
  install_date date,
  last_inspection_date date,
  next_inspection_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extinguisher_id uuid NOT NULL REFERENCES extinguishers(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id),
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('good','defective')),
  pressure_ok boolean NOT NULL,
  seal_ok boolean NOT NULL,
  accessible boolean NOT NULL,
  last_inspection_date date,
  comment text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(extinguisher_id, check_date)
);

CREATE INDEX IF NOT EXISTS idx_extinguishers_station ON extinguishers(station_id);
CREATE INDEX IF NOT EXISTS idx_checks_station_date ON daily_checks(station_id, check_date);
CREATE INDEX IF NOT EXISTS idx_checks_ext_date ON daily_checks(extinguisher_id, check_date);

-- ============ ENABLE RLS ============
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE extinguishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checks ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: STATIONS ============
DROP POLICY IF EXISTS "stations_admin_or_own_select" ON stations;
CREATE POLICY "stations_admin_or_own_select" ON stations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR id = (SELECT station_id FROM profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "stations_admin_insert" ON stations;
CREATE POLICY "stations_admin_insert" ON stations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "stations_admin_update" ON stations;
CREATE POLICY "stations_admin_update" ON stations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "stations_admin_delete" ON stations;
CREATE POLICY "stations_admin_delete" ON stations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ POLICIES: EXTINGUISHERS ============
DROP POLICY IF EXISTS "ext_admin_or_station_select" ON extinguishers;
CREATE POLICY "ext_admin_or_station_select" ON extinguishers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR station_id = (SELECT station_id FROM profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "ext_admin_insert" ON extinguishers;
CREATE POLICY "ext_admin_insert" ON extinguishers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "ext_admin_update" ON extinguishers;
CREATE POLICY "ext_admin_update" ON extinguishers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "ext_admin_delete" ON extinguishers;
CREATE POLICY "ext_admin_delete" ON extinguishers FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ POLICIES: DAILY CHECKS ============
DROP POLICY IF EXISTS "checks_admin_or_station_select" ON daily_checks;
CREATE POLICY "checks_admin_or_station_select" ON daily_checks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR station_id = (SELECT station_id FROM profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "checks_station_insert" ON daily_checks;
CREATE POLICY "checks_station_insert" ON daily_checks FOR INSERT
  TO authenticated WITH CHECK (
    station_id = (SELECT station_id FROM profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'manager')
  );

DROP POLICY IF EXISTS "checks_station_update" ON daily_checks;
CREATE POLICY "checks_station_update" ON daily_checks FOR UPDATE
  TO authenticated USING (
    station_id = (SELECT station_id FROM profiles p WHERE p.id = auth.uid())
  ) WITH CHECK (
    station_id = (SELECT station_id FROM profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "checks_admin_delete" ON daily_checks;
CREATE POLICY "checks_admin_delete" ON daily_checks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ POLICIES: PROFILES ============
DROP POLICY IF EXISTS "profile_self_or_admin_select" ON profiles;
CREATE POLICY "profile_self_or_admin_select" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Self-update: can only change full_name, NOT role/station.
DROP POLICY IF EXISTS "profile_self_update" ON profiles;
CREATE POLICY "profile_self_update" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles pp WHERE pp.id = auth.uid())
    AND station_id IS NOT DISTINCT FROM (SELECT station_id FROM profiles pp WHERE pp.id = auth.uid())
  );

DROP POLICY IF EXISTS "profile_admin_update" ON profiles;
CREATE POLICY "profile_admin_update" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profile_admin_insert" ON profiles;
CREATE POLICY "profile_admin_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profile_admin_delete" ON profiles;
CREATE POLICY "profile_admin_delete" ON profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============ TRIGGER: auto-profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'manager');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STATION REPORTING VIEW ============
CREATE OR REPLACE VIEW stations_reporting_status AS
SELECT
  s.id AS station_id,
  s.name AS station_name,
  s.city AS station_city,
  COUNT(DISTINCT e.id) FILTER (WHERE e.active) AS total_extinguishers,
  COUNT(DISTINCT dc.id) FILTER (WHERE dc.check_date = CURRENT_DATE AND e.active) AS today_checks,
  COUNT(DISTINCT e.id) FILTER (WHERE e.active AND NOT EXISTS (
    SELECT 1 FROM daily_checks dc2
    WHERE dc2.extinguisher_id = e.id AND dc2.check_date = CURRENT_DATE
  )) AS missing_checks,
  COUNT(DISTINCT dc.id) FILTER (WHERE dc.check_date = CURRENT_DATE AND dc.status = 'defective') AS defective_today,
  COUNT(DISTINCT e.id) FILTER (WHERE e.active AND e.next_inspection_date IS NOT NULL AND e.next_inspection_date <= CURRENT_DATE) AS overdue_inspections,
  COUNT(DISTINCT e.id) FILTER (WHERE e.active AND e.next_inspection_date IS NOT NULL AND e.next_inspection_date <= CURRENT_DATE + INTERVAL '30 days' AND e.next_inspection_date > CURRENT_DATE) AS upcoming_inspections
FROM stations s
LEFT JOIN extinguishers e ON e.station_id = s.id
LEFT JOIN daily_checks dc ON dc.extinguisher_id = e.id AND dc.check_date = CURRENT_DATE
GROUP BY s.id, s.name, s.city;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.extinguisher_status_for_date(p_ext_id uuid, p_date date)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status FROM daily_checks WHERE extinguisher_id = p_ext_id AND check_date = p_date),
    'missing'
  );
$$;

CREATE OR REPLACE FUNCTION public.station_reporting_for_date(p_station_id uuid, p_date date)
RETURNS TABLE (
  total_extinguishers bigint,
  checked bigint,
  missing bigint,
  defective bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT e.id) FILTER (WHERE e.active) AS total_extinguishers,
    COUNT(DISTINCT dc.id) FILTER (WHERE dc.check_date = p_date AND e.active) AS checked,
    COUNT(DISTINCT e.id) FILTER (WHERE e.active AND NOT EXISTS (
      SELECT 1 FROM daily_checks dc2
      WHERE dc2.extinguisher_id = e.id AND dc2.check_date = p_date
    )) AS missing,
    COUNT(DISTINCT dc.id) FILTER (WHERE dc.check_date = p_date AND dc.status = 'defective') AS defective
  FROM extinguishers e
  LEFT JOIN daily_checks dc ON dc.extinguisher_id = e.id AND dc.check_date = p_date
  WHERE e.station_id = p_station_id;
$$;

/*
# Add secure station create and update operation

1. Purpose
- Add one server-side operation for administrators to create or modify stations.
- This avoids the stale Data API column cache affecting the `stations.cds` field while preserving all station form fields.

2. Function
- `admin_save_station`
- Accepts an optional station id plus code, name, city, region, CDS, and infrastructure values.
- Returns the saved station id.
- Validates that the caller is an authenticated administrator.
- Validates required station code and name and the supported region values.

3. Security
- Uses `SECURITY DEFINER` with a fixed `search_path`.
- Checks the caller with `auth.uid()` and the `profiles.role` value.
- Revokes execution from `anon` and grants it only to `authenticated`.
- No table policies are weakened or changed.

4. Data safety
- Updates only the requested station when an id is provided.
- Inserts a new station when the id is null.
- No existing rows are deleted.
*/

CREATE OR REPLACE FUNCTION public.admin_save_station(
  p_station_id uuid,
  p_code text,
  p_name text,
  p_city text,
  p_region text,
  p_cds text,
  p_track_islands integer,
  p_has_service_bay boolean,
  p_has_wash_bay boolean,
  p_has_shop boolean,
  p_electrical_cabinets integer,
  p_has_depotting_zone boolean,
  p_has_generator_room boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NULLIF(btrim(p_code), '') IS NULL OR NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Code and name are required';
  END IF;

  IF p_region IS NOT NULL AND p_region NOT IN ('MG', 'BG', 'GF', 'HG', 'Conakry') THEN
    RAISE EXCEPTION 'Invalid region';
  END IF;

  IF p_track_islands < 0 OR p_electrical_cabinets < 0 THEN
    RAISE EXCEPTION 'Infrastructure values cannot be negative';
  END IF;

  IF p_station_id IS NULL THEN
    INSERT INTO stations (
      code, name, city, region, cds, track_islands,
      has_service_bay, has_wash_bay, has_shop, electrical_cabinets,
      has_depotting_zone, has_generator_room
    )
    VALUES (
      btrim(p_code), btrim(p_name), NULLIF(btrim(p_city), ''), p_region, NULLIF(btrim(p_cds), ''), p_track_islands,
      p_has_service_bay, p_has_wash_bay, p_has_shop, p_electrical_cabinets,
      p_has_depotting_zone, p_has_generator_room
    )
    RETURNING id INTO v_station_id;
  ELSE
    UPDATE stations
    SET
      code = btrim(p_code),
      name = btrim(p_name),
      city = NULLIF(btrim(p_city), ''),
      region = p_region,
      cds = NULLIF(btrim(p_cds), ''),
      track_islands = p_track_islands,
      has_service_bay = p_has_service_bay,
      has_wash_bay = p_has_wash_bay,
      has_shop = p_has_shop,
      electrical_cabinets = p_electrical_cabinets,
      has_depotting_zone = p_has_depotting_zone,
      has_generator_room = p_has_generator_room
    WHERE id = p_station_id
    RETURNING id INTO v_station_id;

    IF v_station_id IS NULL THEN
      RAISE EXCEPTION 'Station not found';
    END IF;
  END IF;

  RETURN v_station_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_station(uuid, text, text, text, text, text, integer, boolean, boolean, boolean, integer, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_save_station(uuid, text, text, text, text, text, integer, boolean, boolean, boolean, integer, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_save_station(uuid, text, text, text, text, text, integer, boolean, boolean, boolean, integer, boolean, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';

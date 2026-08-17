/*
# Lookup manager email by station code

1. New Functions
- `get_email_by_station_code(p_code text)` — SECURITY DEFINER function that
  returns the email of the manager profile assigned to the station with the
  given code. Executable by anon + authenticated so the login page can resolve
  a station code to an email before calling supabase.auth.signInWithPassword.
2. Security
- SECURITY DEFINER with fixed search_path.
- Returns only the email (never the password or other sensitive fields).
- Returns NULL if no manager is assigned to the station or the code doesn't exist.
*/

CREATE OR REPLACE FUNCTION public.get_email_by_station_code(p_code text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email
  FROM profiles p
  JOIN stations s ON p.station_id = s.id
  WHERE s.code = upper(trim(p_code))
    AND p.role = 'manager'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_station_code(text) TO anon, authenticated;

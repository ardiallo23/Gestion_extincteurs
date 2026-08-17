-- Allow managers to update extinguishers at their own station
DROP POLICY IF EXISTS "ext_admin_update" ON extinguishers;

CREATE POLICY "ext_admin_or_manager_update" ON extinguishers FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'manager' AND station_id = get_my_station_id())
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR (get_my_role() = 'manager' AND station_id = get_my_station_id())
  );

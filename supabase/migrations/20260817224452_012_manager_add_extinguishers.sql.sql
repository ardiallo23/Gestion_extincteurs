/*
# Allow managers to add extinguishers to their own station

## Changes
1. Security (RLS policy update on `extinguishers`)
   - Replace the existing `ext_admin_insert` policy with one that allows:
     - admins to insert any extinguisher
     - managers to insert extinguishers where station_id = their own station
   - This enables gérants to add new extinguishers from their mobile app.

## Important notes
1. The INSERT WITH CHECK ensures the manager can only create extinguishers
   for the station they are assigned to.
2. The station_id is set automatically from the manager's profile on the frontend.
*/

DROP POLICY IF EXISTS "ext_admin_insert" ON extinguishers;
DROP POLICY IF EXISTS "ext_admin_or_manager_insert" ON extinguishers;

CREATE POLICY "ext_admin_or_manager_insert"
ON extinguishers FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'admin'
  OR (get_my_role() = 'manager' AND station_id = get_my_station_id())
);

/*
# Refresh stations API schema cache

1. Purpose
- Refresh the Supabase Data API schema cache after the `stations.cds` column was added.
- This makes station creation and editing recognize the existing `cds` column.
2. Database changes
- No tables, columns, indexes, data, or policies are changed.
3. Security
- No access rules are changed.
4. Notes
- This is a metadata refresh only and is safe to run again.
*/

NOTIFY pgrst, 'reload schema';

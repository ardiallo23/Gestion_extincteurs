/*
# Extinguishers by region with compliance status

1. New Views
- `extinguishers_by_region`: aggregates active extinguishers by region and type,
  with a compliance flag indicating whether the station meets all 7 rules.
- Columns: region, type, total, compliant, non_compliant
2. Security
- Read-only view, no policy changes.
3. Notes
- An extinguisher is "compliant" if its station passes all 7 compliance rules
  (r1..r7: actual >= expected for each).
- Only active extinguishers are counted.
*/

CREATE OR REPLACE VIEW extinguishers_by_region AS
WITH station_status AS (
  SELECT
    sc.station_id,
    (
      sc.r1_actual >= sc.r1_expected AND
      sc.r2_actual >= sc.r2_expected AND
      sc.r3_actual >= sc.r3_expected AND
      sc.r4_actual >= sc.r4_expected AND
      sc.r5_actual >= sc.r5_expected AND
      sc.r6_actual >= sc.r6_expected AND
      sc.r7_actual >= sc.r7_expected
    ) AS is_compliant
  FROM station_compliance sc
)
SELECT
  s.region AS region,
  COALESCE(NULLIF(e.type, ''), 'Non renseigné') AS type,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE ss.is_compliant)::int AS compliant,
  COUNT(*) FILTER (WHERE NOT ss.is_compliant)::int AS non_compliant
FROM extinguishers e
JOIN stations s ON s.id = e.station_id
JOIN station_status ss ON ss.station_id = e.station_id
WHERE e.active AND s.region IS NOT NULL
GROUP BY s.region, COALESCE(NULLIF(e.type, ''), 'Non renseigné');

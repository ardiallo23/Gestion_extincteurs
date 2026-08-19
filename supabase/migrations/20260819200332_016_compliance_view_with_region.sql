/*
# Add region to station_compliance view

1. Changes
- Drop and recreate the `station_compliance` view to include `station_region` (from `stations.region`).
- All other columns remain identical to the existing view, in the same order.
2. Security
- No policy changes — this is a read-only view, security unchanged.
3. Notes
- The view is dropped first because CREATE OR REPLACE cannot change column names/order.
*/

DROP VIEW IF EXISTS station_compliance;

CREATE VIEW station_compliance AS
SELECT
  s.id AS station_id,
  s.name AS station_name,
  s.city AS station_city,
  s.region AS station_region,

  s.track_islands AS r1_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '9kg' AND e.location = 'Piste' AND e.active) AS r1_actual,

  s.electrical_cabinets AS r2_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'CO2' AND e.location = 'Local électrique' AND e.active) AS r2_actual,

  CASE WHEN s.has_service_bay THEN 1 ELSE 0 END AS r3_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '9kg' AND e.location = 'Baie de service' AND e.active) AS r3_actual,

  CASE WHEN s.has_wash_bay THEN 1 ELSE 0 END AS r4_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '9kg' AND e.location = 'Baie de lavage' AND e.active) AS r4_actual,

  CASE WHEN s.has_depotting_zone THEN 1 ELSE 0 END AS r5_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '50kg' AND e.location = 'Zone de depotage' AND e.active) AS r5_actual,

  CASE WHEN s.has_generator_room THEN 1 ELSE 0 END AS r6_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'CO2' AND e.location = 'Local GE' AND e.active) AS r6_actual,

  CASE WHEN s.has_shop THEN 1 ELSE 0 END AS r7_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Eau' AND e.location = 'Boutique' AND e.active) AS r7_actual

FROM stations s
LEFT JOIN extinguishers e ON e.station_id = s.id
GROUP BY s.id, s.name, s.city, s.region;

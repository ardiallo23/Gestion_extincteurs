-- Compliance view: checks all 7 rules per station and returns pass/fail + expected vs actual counts
CREATE OR REPLACE VIEW station_compliance AS
SELECT
  s.id AS station_id,
  s.name AS station_name,
  s.city AS station_city,

  -- Rule 1: track islands = Poudre 9kg on Piste
  s.track_islands AS r1_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '9kg' AND e.location = 'Piste' AND e.active) AS r1_actual,

  -- Rule 2: electrical cabinets = CO2 in Local électrique
  s.electrical_cabinets AS r2_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'CO2' AND e.location = 'Local électrique' AND e.active) AS r2_actual,

  -- Rule 3: service bay -> 1x Poudre 9kg in Baie de service
  CASE WHEN s.has_service_bay THEN 1 ELSE 0 END AS r3_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '9kg' AND e.location = 'Baie de service' AND e.active) AS r3_actual,

  -- Rule 4: wash bay -> 1x Poudre 9kg in Baie de lavage
  CASE WHEN s.has_wash_bay THEN 1 ELSE 0 END AS r4_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '9kg' AND e.location = 'Baie de lavage' AND e.active) AS r4_actual,

  -- Rule 5: depotting zone -> 1x Poudre 50kg in Zone de depotage
  CASE WHEN s.has_depotting_zone THEN 1 ELSE 0 END AS r5_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Poudre' AND e.capacity = '50kg' AND e.location = 'Zone de depotage' AND e.active) AS r5_actual,

  -- Rule 6: generator room -> 1x CO2 in Local GE
  CASE WHEN s.has_generator_room THEN 1 ELSE 0 END AS r6_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'CO2' AND e.location = 'Local GE' AND e.active) AS r6_actual,

  -- Rule 7: shop -> 1x Eau in Boutique
  CASE WHEN s.has_shop THEN 1 ELSE 0 END AS r7_expected,
  COUNT(e.id) FILTER (WHERE e.type = 'Eau' AND e.location = 'Boutique' AND e.active) AS r7_actual

FROM stations s
LEFT JOIN extinguishers e ON e.station_id = s.id
GROUP BY s.id, s.name, s.city;
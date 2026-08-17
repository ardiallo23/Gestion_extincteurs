-- Re-seed extinguishers to match each station's infrastructure compliance rules:
-- 1. Each track island -> 1x Poudre ABC 9kg on Piste
-- 2. Each electrical cabinet -> 1x CO2 in Local électrique
-- 3. Service bay -> 1x Poudre ABC 9kg in Baie de service
-- 4. Wash bay -> 1x Poudre ABC 9kg in Baie de lavage
-- 5. Depotting zone -> 1x Poudre ABC 50kg in Zone de depotage
-- 6. Generator room -> 1x CO2 in Local GE
-- 7. Shop -> 1x Eau in Boutique

-- Use a CTE to generate extinguishers per station based on infrastructure
-- We'll insert via a plpgsql block for clarity
DO $$
DECLARE
  s RECORD;
  base_install date := '2025-01-15';
  base_next date := '2026-09-30';
  serial_counter int := 1;
BEGIN
  FOR s IN SELECT * FROM stations ORDER BY name LOOP
    -- 1. Track islands: Poudre ABC 9kg on Piste
    FOR i IN 1..s.track_islands LOOP
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-PISTE-' || LPAD(i::text, 2, '0'), 'Poudre', 'Pression auxiliaire', 'Piste', 'SN-' || LPAD(serial_counter::text, 5, '0'), '9kg', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END LOOP;

    -- 2. Electrical cabinets: CO2 in Local électrique
    FOR i IN 1..s.electrical_cabinets LOOP
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-ELEC-' || LPAD(i::text, 2, '0'), 'CO2', 'Pression permanente', 'Local électrique', 'SN-' || LPAD(serial_counter::text, 5, '0'), '5kg', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END LOOP;

    -- 3. Service bay: Poudre ABC 9kg
    IF s.has_service_bay THEN
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-SERVICE-01', 'Poudre', 'Pression auxiliaire', 'Baie de service', 'SN-' || LPAD(serial_counter::text, 5, '0'), '9kg', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END IF;

    -- 4. Wash bay: Poudre ABC 9kg
    IF s.has_wash_bay THEN
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-LAVAGE-01', 'Poudre', 'Pression auxiliaire', 'Baie de lavage', 'SN-' || LPAD(serial_counter::text, 5, '0'), '9kg', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END IF;

    -- 5. Depotting zone: Poudre ABC 50kg
    IF s.has_depotting_zone THEN
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-DEPOT-01', 'Poudre', 'Pression auxiliaire', 'Zone de depotage', 'SN-' || LPAD(serial_counter::text, 5, '0'), '50kg', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END IF;

    -- 6. Generator room: CO2
    IF s.has_generator_room THEN
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-GE-01', 'CO2', 'Pression permanente', 'Local GE', 'SN-' || LPAD(serial_counter::text, 5, '0'), '5kg', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END IF;

    -- 7. Shop: Eau
    IF s.has_shop THEN
      INSERT INTO extinguishers (station_id, label, type, pressure_type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active)
      VALUES (s.id, 'EXT-BOUTIQUE-01', 'Eau', 'Pression permanente', 'Boutique', 'SN-' || LPAD(serial_counter::text, 5, '0'), '9L', base_install, base_install, base_next, true);
      serial_counter := serial_counter + 1;
    END IF;
  END LOOP;
END $$;
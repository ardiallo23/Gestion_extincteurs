/*
# Seed Demo Data — Stations, Extinguishers, Users, Daily Checks

## What this adds
- 5 gas stations across different cities
- 4-6 extinguishers per station (24 total) with varied types, locations, inspection dates
- 1 admin user (siège) + 5 manager users (one per station)
- ~10 days of daily check history (partial — some days/stations missing to demo alerts)
- Today's checks: partially completed to demonstrate "missing" alert states

## Demo credentials
- Admin: admin@stations.fr / Admin123!
- Manager Station 1: gerant.nord@stations.fr / Gerant123!
- Manager Station 2: gerant.sud@stations.fr / Gerant123!
- Manager Station 3: gerant.est@stations.fr / Gerant123!
- Manager Station 4: gerant.ouest@stations.fr / Gerant123!
- Manager Station 5: gerant.centrale@stations.fr / Gerant123!
*/

-- ============ STATIONS ============
INSERT INTO stations (id, name, address, city) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Station Nord', '12 Avenue des Lilas', 'Lille'),
  ('11111111-1111-1111-1111-111111111102', 'Station Sud', '45 Boulevard du Soleil', 'Marseille'),
  ('11111111-1111-1111-1111-111111111103', 'Station Est', '8 Rue de la Gare', 'Strasbourg'),
  ('11111111-1111-1111-1111-111111111104', 'Station Ouest', '23 Avenue de l''Océan', 'Nantes'),
  ('11111111-1111-1111-1111-111111111105', 'Station Centrale', '1 Place de la République', 'Lyon')
ON CONFLICT (id) DO NOTHING;

-- ============ USERS (auth.users) ============
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, aud, role, confirmation_token, recovery_token)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000000', 'admin@stations.fr', crypt('Admin123!', gen_salt('bf')), now(), now(), now(), null, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Administrateur Siège"}'::jsonb, 'authenticated', 'authenticated', '', ''),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '00000000-0000-0000-0000-000000000000', 'gerant.nord@stations.fr', crypt('Gerant123!', gen_salt('bf')), now(), now(), now(), null, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Pierre Dubois"}'::jsonb, 'authenticated', 'authenticated', '', ''),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '00000000-0000-0000-0000-000000000000', 'gerant.sud@stations.fr', crypt('Gerant123!', gen_salt('bf')), now(), now(), now(), null, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Marie Martin"}'::jsonb, 'authenticated', 'authenticated', '', ''),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '00000000-0000-0000-0000-000000000000', 'gerant.est@stations.fr', crypt('Gerant123!', gen_salt('bf')), now(), now(), now(), null, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Thomas Schmidt"}'::jsonb, 'authenticated', 'authenticated', '', ''),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '00000000-0000-0000-0000-000000000000', 'gerant.ouest@stations.fr', crypt('Gerant123!', gen_salt('bf')), now(), now(), now(), null, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Julie Le Gall"}'::jsonb, 'authenticated', 'authenticated', '', ''),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', '00000000-0000-0000-0000-000000000000', 'gerant.centrale@stations.fr', crypt('Gerant123!', gen_salt('bf')), now(), now(), now(), null, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Karim Benali"}'::jsonb, 'authenticated', 'authenticated', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============ IDENTITIES ============
INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
FROM auth.users
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6')
ON CONFLICT DO NOTHING;

-- ============ UPDATE PROFILES ============
UPDATE profiles SET role = 'admin', full_name = 'Administrateur Siège' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
UPDATE profiles SET station_id = '11111111-1111-1111-1111-111111111101', full_name = 'Pierre Dubois' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
UPDATE profiles SET station_id = '11111111-1111-1111-1111-111111111102', full_name = 'Marie Martin' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
UPDATE profiles SET station_id = '11111111-1111-1111-1111-111111111103', full_name = 'Thomas Schmidt' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
UPDATE profiles SET station_id = '11111111-1111-1111-1111-111111111104', full_name = 'Julie Le Gall' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
UPDATE profiles SET station_id = '11111111-1111-1111-1111-111111111105', full_name = 'Karim Benali' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6';

-- ============ EXTINGUISHERS ============
INSERT INTO extinguishers (id, station_id, label, type, location, serial_number, capacity, install_date, last_inspection_date, next_inspection_date, active) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'EXT-NORD-01', 'Poudre', 'Pompe essence zone 1', 'SN-N-001', '6kg', '2022-03-15', '2025-03-15', '2026-03-15', true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 'EXT-NORD-02', 'CO2', 'Bâtiment boutique', 'SN-N-002', '5kg', '2022-03-15', '2025-01-10', '2026-01-10', true),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'EXT-NORD-03', 'Poudre', 'Aire de lavage', 'SN-N-003', '9kg', '2021-06-20', '2024-06-20', '2025-06-20', true),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101', 'EXT-NORD-04', 'Eau', 'Local technique', 'SN-N-004', '9L', '2023-01-05', '2025-08-01', '2026-08-01', true),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', 'EXT-NORD-05', 'Poudre', 'Pompe essence zone 2', 'SN-N-005', '6kg', '2022-03-15', '2025-03-15', '2026-03-15', true),
  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111102', 'EXT-SUD-01', 'Poudre', 'Pompe essence', 'SN-S-001', '6kg', '2022-07-10', '2025-07-10', '2026-07-10', true),
  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111102', 'EXT-SUD-02', 'CO2', 'Boutique', 'SN-S-002', '5kg', '2021-09-15', '2024-09-15', '2025-09-15', true),
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111102', 'EXT-SUD-03', 'Poudre', 'Aire de lavage', 'SN-S-003', '9kg', '2023-02-01', '2025-02-01', '2026-02-01', true),
  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111102', 'EXT-SUD-04', 'Eau', 'Local stock', 'SN-S-004', '9L', '2022-11-20', '2025-08-20', '2026-08-20', true),
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111103', 'EXT-EST-01', 'Poudre', 'Pompe diesel', 'SN-E-001', '6kg', '2022-05-10', '2025-05-10', '2026-05-10', true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111103', 'EXT-EST-02', 'CO2', 'Bureau gérant', 'SN-E-002', '5kg', '2023-03-01', '2025-08-15', '2026-08-15', true),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111103', 'EXT-EST-03', 'Poudre', 'Aire de lavage', 'SN-E-003', '9kg', '2021-12-01', '2024-12-01', '2025-12-01', true),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111103', 'EXT-EST-04', 'Eau', 'Local technique', 'SN-E-004', '9L', '2022-08-20', '2025-08-20', '2026-08-20', true),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111103', 'EXT-EST-05', 'Poudre', 'Sortie vehicles', 'SN-E-005', '6kg', '2022-05-10', '2025-05-10', '2026-05-10', true),
  ('22222222-2222-2222-2222-222222222231', '11111111-1111-1111-1111-111111111104', 'EXT-OUEST-01', 'Poudre', 'Pompe essence', 'SN-O-001', '6kg', '2022-04-15', '2025-04-15', '2026-04-15', true),
  ('22222222-2222-2222-2222-222222222232', '11111111-1111-1111-1111-111111111104', 'EXT-OUEST-02', 'CO2', 'Boutique', 'SN-O-002', '5kg', '2021-10-01', '2024-10-01', '2025-10-01', true),
  ('22222222-2222-2222-2222-222222222233', '11111111-1111-1111-1111-111111111104', 'EXT-OUEST-03', 'Poudre', 'Aire de lavage', 'SN-O-003', '9kg', '2023-05-01', '2025-08-10', '2026-08-10', true),
  ('22222222-2222-2222-2222-222222222234', '11111111-1111-1111-1111-111111111104', 'EXT-OUEST-04', 'Eau', 'Local réception', 'SN-O-004', '9L', '2022-09-15', '2025-09-15', '2026-09-15', true),
  ('22222222-2222-2222-2222-222222222241', '11111111-1111-1111-1111-111111111105', 'EXT-CENT-01', 'Poudre', 'Pompe essence zone 1', 'SN-C-001', '6kg', '2022-06-01', '2025-06-01', '2026-06-01', true),
  ('22222222-2222-2222-2222-222222222242', '11111111-1111-1111-1111-111111111105', 'EXT-CENT-02', 'CO2', 'Boutique', 'SN-C-002', '5kg', '2022-06-01', '2025-06-01', '2026-06-01', true),
  ('22222222-2222-2222-2222-222222222243', '11111111-1111-1111-1111-111111111105', 'EXT-CENT-03', 'Poudre', 'Aire de lavage', 'SN-C-003', '9kg', '2021-03-15', '2024-03-15', '2025-03-15', true),
  ('22222222-2222-2222-2222-222222222244', '11111111-1111-1111-1111-111111111105', 'EXT-CENT-04', 'Eau', 'Local technique', 'SN-C-004', '9L', '2023-07-01', '2025-07-01', '2026-07-01', true),
  ('22222222-2222-2222-2222-222222222245', '11111111-1111-1111-1111-111111111105', 'EXT-CENT-05', 'Poudre', 'Pompe essence zone 2', 'SN-C-005', '6kg', '2022-06-01', '2025-06-01', '2026-06-01', true),
  ('22222222-2222-2222-2222-222222222246', '11111111-1111-1111-1111-111111111105', 'EXT-CENT-06', 'CO2', 'Bureau', 'SN-C-006', '5kg', '2023-01-15', '2025-08-30', '2026-08-30', true)
ON CONFLICT (id) DO NOTHING;

-- ============ DAILY CHECKS: last 9 days ============
-- Station Nord: fully checked D-9 to D-1
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111101', d.dt, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
FROM extinguishers e
CROSS JOIN (SELECT CURRENT_DATE - n AS dt FROM generate_series(1, 9) AS n) d
WHERE e.station_id = '11111111-1111-1111-1111-111111111101' AND e.active
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

UPDATE daily_checks SET status = 'defective', pressure_ok = false, comment = 'Manomètre dans le rouge, à remplacer' 
WHERE extinguisher_id = '22222222-2222-2222-2222-222222222203' AND check_date = CURRENT_DATE - 3;

-- Station Sud: fully checked D-9 to D-1
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111102', d.dt, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'
FROM extinguishers e
CROSS JOIN (SELECT CURRENT_DATE - n AS dt FROM generate_series(1, 9) AS n) d
WHERE e.station_id = '11111111-1111-1111-1111-111111111102' AND e.active
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

-- Station Est: checked D-9 to D-5 only (missing D-4 to D-1)
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111103', d.dt, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'
FROM extinguishers e
CROSS JOIN (SELECT CURRENT_DATE - n AS dt FROM generate_series(5, 9) AS n) d
WHERE e.station_id = '11111111-1111-1111-1111-111111111103' AND e.active
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

-- Station Ouest: fully checked D-9 to D-1
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111104', d.dt, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5'
FROM extinguishers e
CROSS JOIN (SELECT CURRENT_DATE - n AS dt FROM generate_series(1, 9) AS n) d
WHERE e.station_id = '11111111-1111-1111-1111-111111111104' AND e.active
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

-- Station Centrale: checked D-9 to D-2 (missing D-1)
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111105', d.dt, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6'
FROM extinguishers e
CROSS JOIN (SELECT CURRENT_DATE - n AS dt FROM generate_series(2, 9) AS n) d
WHERE e.station_id = '11111111-1111-1111-1111-111111111105' AND e.active
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

UPDATE daily_checks SET status = 'defective', seal_ok = false, comment = 'Plomb cassé, à remplacer' 
WHERE extinguisher_id = '22222222-2222-2222-2222-222222222243' AND check_date = CURRENT_DATE - 5;

-- ============ TODAY'S CHECKS (partial) ============
-- Station Nord: all checked today
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111101', CURRENT_DATE, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
FROM extinguishers e
WHERE e.station_id = '11111111-1111-1111-1111-111111111101' AND e.active
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

-- Station Sud: 3 good + 1 defective today
INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
SELECT e.id, '11111111-1111-1111-1111-111111111102', CURRENT_DATE, 'good', true, true, true, e.last_inspection_date, NULL, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'
FROM extinguishers e
WHERE e.station_id = '11111111-1111-1111-1111-111111111102' AND e.active AND e.id != '22222222-2222-2222-2222-222222222212'
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

INSERT INTO daily_checks (extinguisher_id, station_id, check_date, status, pressure_ok, seal_ok, accessible, last_inspection_date, comment, created_by)
VALUES ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111102', CURRENT_DATE, 'defective', false, true, true, '2024-09-15', 'Pression insuffisante détectée', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3')
ON CONFLICT (extinguisher_id, check_date) DO NOTHING;

-- Stations Est, Ouest, Centrale: NO checks today (triggers missing alerts)

/*
# Assign regions to existing demo stations

1. Changes
- Update `stations.region` for the 5 demo stations so the region compliance chart has data.
- Station Nord → HG (Haute Guinée)
- Station Sud → GF (Guinée Forestière)
- Station Est → BG (Basse Guinée)
- Station Ouest → MG (Moyenne Guinée)
- Station Centrale → Conakry
2. Security
- No schema or policy changes.
*/

UPDATE stations SET region = 'HG' WHERE name = 'Station Nord';
UPDATE stations SET region = 'GF' WHERE name = 'Station Sud';
UPDATE stations SET region = 'BG' WHERE name = 'Station Est';
UPDATE stations SET region = 'MG' WHERE name = 'Station Ouest';
UPDATE stations SET region = 'Conakry' WHERE name = 'Station Centrale';

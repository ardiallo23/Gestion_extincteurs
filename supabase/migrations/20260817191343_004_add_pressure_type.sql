-- Add pressure_type column to extinguishers
ALTER TABLE extinguishers ADD COLUMN pressure_type text NOT NULL DEFAULT 'Pression permanente'
  CHECK (pressure_type IN ('Pression permanente', 'Pression auxiliaire'));

-- Assign realistic pressure types based on extinguisher type:
-- CO2 extinguishers are typically permanent pressure
-- Powder extinguishers are often auxiliary pressure
-- Water extinguishers can be either; assign permanent for demo
UPDATE extinguishers SET pressure_type = 'Pression auxiliaire' WHERE type = 'Poudre';
UPDATE extinguishers SET pressure_type = 'Pression permanente' WHERE type IN ('CO2', 'Eau');
export const DEMO_CREDENTIALS = [
  { label: 'Administrateur (siège)', email: 'admin@stations.fr', password: 'Admin123!' },
  { label: 'Station Nord (Lille)', email: 'gerant.nord@stations.fr', password: 'Gerant123!', code: 'ST-001' },
  { label: 'Station Sud (Marseille)', email: 'gerant.sud@stations.fr', password: 'Gerant123!', code: 'ST-002' },
  { label: 'Station Est (Strasbourg)', email: 'gerant.est@stations.fr', password: 'Gerant123!', code: 'ST-003' },
  { label: 'Station Ouest (Nantes)', email: 'gerant.ouest@stations.fr', password: 'Gerant123!', code: 'ST-004' },
  { label: 'Technicien (lecture seule)', email: 'technicien@stations.fr', password: 'Tech123!' },
];

export const INSPECTION_WARNING_DAYS = 30;

export const EXTINGUISHER_VALIDITY_DAYS = 365;

export const EXTINGUISHER_TYPES = ['Poudre', 'Eau', 'CO2'] as const;

export const EXTINGUISHER_PRESSURE_TYPES = ['Pression permanente', 'Pression auxiliaire'] as const;

export const EXTINGUISHER_LOCATIONS = [
  'Piste',
  'Local GE',
  'Boutique',
  'Local électrique',
  'Zone de depotage',
  'Baie de service',
  'Baie de lavage',
] as const;

export const EXTINGUISHER_CAPACITIES = ['6kg', '9kg', '50kg', '5kg', '9L'] as const;

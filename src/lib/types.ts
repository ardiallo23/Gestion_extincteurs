export type UserRole = 'admin' | 'manager' | 'technician';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  station_id: string | null;
  created_at: string;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  track_islands: number;
  has_service_bay: boolean;
  has_wash_bay: boolean;
  has_shop: boolean;
  electrical_cabinets: number;
  has_depotting_zone: boolean;
  has_generator_room: boolean;
  created_at: string;
}

export interface Extinguisher {
  id: string;
  station_id: string;
  label: string;
  type: string | null;
  pressure_type: string | null;
  location: string | null;
  serial_number: string | null;
  capacity: string | null;
  install_date: string | null;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  active: boolean;
  created_at: string;
  station?: Station;
}

export type CheckStatus = 'good' | 'defective';

export interface DailyCheck {
  id: string;
  extinguisher_id: string;
  station_id: string;
  check_date: string;
  status: CheckStatus;
  pressure_ok: boolean;
  seal_ok: boolean;
  accessible: boolean;
  last_inspection_date: string | null;
  comment: string | null;
  created_by: string | null;
  created_at: string;
  extinguisher?: Extinguisher;
  station?: Station;
}

export interface StationReportingStatus {
  station_id: string;
  station_name: string;
  station_city: string | null;
  total_extinguishers: number;
  today_checks: number;
  missing_checks: number;
  defective_today: number;
  overdue_inspections: number;
  upcoming_inspections: number;
}

export type ExtinguisherLiveStatus = 'good' | 'defective' | 'missing';

export interface ExtinguisherWithStatus extends Extinguisher {
  todayStatus: ExtinguisherLiveStatus;
  todayCheck?: DailyCheck | null;
}

export interface StationCompliance {
  station_id: string;
  station_name: string;
  station_city: string | null;
  r1_expected: number;
  r1_actual: number;
  r2_expected: number;
  r2_actual: number;
  r3_expected: number;
  r3_actual: number;
  r4_expected: number;
  r4_actual: number;
  r5_expected: number;
  r5_actual: number;
  r6_expected: number;
  r6_actual: number;
  r7_expected: number;
  r7_actual: number;
}

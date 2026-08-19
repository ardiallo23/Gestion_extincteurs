import { useEffect, useState, useCallback, useMemo } from 'react';
import { Building2, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Circle as XCircle, CalendarClock, Flame, TrendingUp, TrendingDown, MapPin, ArrowRight, Activity, ShieldCheck, Clock, Filter, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type {
  StationReportingStatus,
  ExtinguisherWithStatus,
  ExtinguisherLiveStatus,
} from '@/lib/types';
import { BlinkingDot } from '@/components/BlinkingDot';
import { ExpirationAlerts } from '@/components/ExpirationAlerts';
import { cn, formatDate, daysUntil, inspectionState } from '@/lib/utils';
import { INSPECTION_WARNING_DAYS } from '@/lib/constants';
import type { PageKey } from '@/components/Layout';

export function AdminDashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { profile } = useAuth();
  const [reporting, setReporting] = useState<StationReportingStatus[]>([]);
  const [allExtinguishers, setAllExtinguishers] = useState<ExtinguisherWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [extFilter, setExtFilter] = useState<'all' | 'issues' | 'good'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reportingRes, extRes, checksRes] = await Promise.all([
      supabase.from('stations_reporting_status').select('*'),
      supabase.from('extinguishers').select('*, station:stations(*)').eq('active', true),
      supabase.from('daily_checks').select('*').eq('check_date', new Date().toISOString().split('T')[0]),
    ]);

    if (reportingRes.data) setReporting(reportingRes.data as StationReportingStatus[]);

    const checksMap = new Map<string, any>();
    if (checksRes.data) {
      checksRes.data.forEach((c) => checksMap.set(c.extinguisher_id, c));
    }

    if (extRes.data) {
      const withStatus: ExtinguisherWithStatus[] = (extRes.data as any[]).map((e) => {
        const todayCheck = checksMap.get(e.id) || null;
        const todayStatus: ExtinguisherLiveStatus = todayCheck ? todayCheck.status : 'missing';
        return { ...e, todayStatus, todayCheck };
      });
      setAllExtinguishers(withStatus);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = reporting.reduce(
    (acc, r) => ({
      totalExtinguishers: acc.totalExtinguishers + (r.total_extinguishers || 0),
      missingToday: acc.missingToday + (r.missing_checks || 0),
      defectiveToday: acc.defectiveToday + (r.defective_today || 0),
      overdue: acc.overdue + (r.overdue_inspections || 0),
      upcoming: acc.upcoming + (r.upcoming_inspections || 0),
      stationsMissing: acc.stationsMissing + ((r.missing_checks || 0) > 0 ? 1 : 0),
      totalChecked: acc.totalChecked + (r.today_checks || 0),
    }),
    { totalExtinguishers: 0, missingToday: 0, defectiveToday: 0, overdue: 0, upcoming: 0, stationsMissing: 0, totalChecked: 0 },
  );

  const reportingRate = totals.totalExtinguishers > 0
    ? Math.round((totals.totalChecked / totals.totalExtinguishers) * 100)
    : 0;

  const filteredExtinguishers = useMemo(() => {
    let list = selectedStation
      ? allExtinguishers.filter((e) => e.station_id === selectedStation)
      : allExtinguishers;
    if (extFilter === 'issues') {
      list = list.filter((e) => e.todayStatus !== 'good');
    } else if (extFilter === 'good') {
      list = list.filter((e) => e.todayStatus === 'good');
    }
    return list;
  }, [allExtinguishers, selectedStation, extFilter]);

  const selectedStationName = selectedStation
    ? reporting.find((r) => r.station_id === selectedStation)?.station_name
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-slate-500 mt-1">
            Vue globale du parc — {reporting.length} stations, {totals.totalExtinguishers} extincteurs
          </p>
        </div>
        {/* Reporting completion ring */}
        <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-5 py-3 shadow-sm">
          <ProgressRing percent={reportingRate} size={56} />
          <div>
            <p className="text-xs font-medium text-slate-500">Saisies du jour</p>
            <p className={cn(
              'text-lg font-bold tabular-nums',
              reportingRate >= 80 ? 'text-emerald-600' : reportingRate >= 50 ? 'text-amber-600' : 'text-red-600',
            )}>
              {reportingRate}%
            </p>
            <p className="text-[10px] text-slate-400 tabular-nums">{totals.totalChecked}/{totals.totalExtinguishers} vérifiés</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Extincteurs au total"
          value={totals.totalExtinguishers}
          sublabel={`${reporting.length} stations`}
          icon={Flame}
          color="slate"
          delay={0}
        />
        <KpiCard
          label="Saisies manquantes"
          value={totals.missingToday}
          sublabel={`${totals.stationsMissing} station(s) concernée(s)`}
          icon={AlertTriangle}
          color={totals.missingToday > 0 ? 'amber' : 'emerald'}
          alert={totals.missingToday > 0}
          delay={0.1}
        />
        <KpiCard
          label="Extincteurs défectueux"
          value={totals.defectiveToday}
          sublabel={totals.defectiveToday > 0 ? 'Intervention requise' : 'Aucun défaut'}
          icon={XCircle}
          color={totals.defectiveToday > 0 ? 'red' : 'emerald'}
          alert={totals.defectiveToday > 0}
          delay={0.15}
        />
        <KpiCard
          label="Inspections en retard"
          value={totals.overdue}
          sublabel={totals.upcoming > 0 ? `+ ${totals.upcoming} à venir ≤ ${INSPECTION_WARNING_DAYS}j` : 'Aucune à venir'}
          icon={CalendarClock}
          color={totals.overdue > 0 ? 'red' : totals.upcoming > 0 ? 'amber' : 'emerald'}
          alert={totals.overdue > 0}
          delay={0.2}
        />
      </div>

      {/* Alert banners */}
      {(totals.stationsMissing > 0 || totals.overdue > 0) && (
        <div className="space-y-3">
          {totals.stationsMissing > 0 && (
            <AlertBanner
              variant="warning"
              icon={AlertTriangle}
              title={`${totals.stationsMissing} station(s) n'ont pas fait leur saisie du jour`}
              message="Cliquez sur une station ci-dessous pour voir les extincteurs non vérifiés."
            />
          )}
          {totals.overdue > 0 && (
            <AlertBanner
              variant="danger"
              icon={CalendarClock}
              title={`${totals.overdue} extincteur(s) ont une inspection réglementaire dépassée`}
              message="Une inspection doit être planifiée au plus vite."
            />
          )}
        </div>
      )}

      {/* Expiration alerts — 3 months ahead */}
      <ExpirationAlerts extinguishers={allExtinguishers} showStation />

      {/* Station grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-400" />
            Stations
          </h2>
          <button
            onClick={() => onNavigate('stations')}
            className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            Gérer les stations
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reporting.map((r, idx) => (
            <StationCard
              key={r.station_id}
              reporting={r}
              selected={selectedStation === r.station_id}
              onClick={() => setSelectedStation(selectedStation === r.station_id ? null : r.station_id)}
              delay={idx * 0.06}
            />
          ))}
        </div>
      </div>

      {/* Extinguisher grid */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {selectedStation ? (
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                {selectedStationName}
                <button
                  onClick={() => setSelectedStation(null)}
                  className="text-sm font-normal text-slate-400 hover:text-slate-600 transition-colors"
                >
                  (voir tout)
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Tous les extincteurs
              </span>
            )}
          </h2>

          {/* Filter toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 p-0.5 shadow-sm">
            {([
              { key: 'all' as const, label: 'Tous', icon: null },
              { key: 'issues' as const, label: 'Alertes', icon: AlertTriangle },
              { key: 'good' as const, label: 'OK', icon: CheckCircle2 },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setExtFilter(opt.key)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  extFilter === opt.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {opt.icon && <opt.icon className="h-3 w-3" />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filteredExtinguishers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 rounded-xl bg-white border border-slate-200">
            <Flame className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Aucun extincteur à afficher avec ce filtre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredExtinguishers.map((ext, idx) => (
              <ExtinguisherCard key={ext.id} ext={ext} showStation={!selectedStation} delay={idx * 0.03} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Progress Ring ---

function ProgressRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? '#059669' : percent >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
    </div>
  );
}

// --- KPI Card ---

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
  alert,
  delay = 0,
}: {
  label: string;
  value: number;
  sublabel?: string;
  icon: typeof Flame;
  color: 'slate' | 'emerald' | 'amber' | 'red';
  alert?: boolean;
  delay?: number;
}) {
  const colors = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-600', gradient: 'from-slate-100 to-slate-200' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', gradient: 'from-emerald-50 to-teal-50' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', gradient: 'from-amber-50 to-orange-50' },
    red: { bg: 'bg-red-50', text: 'text-red-600', gradient: 'from-red-50 to-orange-50' },
  };
  const c = colors[color];

  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md count-up',
        alert && color === 'red' && 'ring-2 ring-red-200/60',
        alert && color === 'amber' && 'ring-2 ring-amber-200/60',
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-500 leading-snug">{label}</span>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br', c.gradient)}>
          <Icon className={cn('h-5 w-5', c.text)} />
        </div>
      </div>
      <p className={cn('text-3xl font-bold tabular-nums', c.text)}>{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
    </div>
  );
}

// --- Alert Banner ---

function AlertBanner({
  variant,
  icon: Icon,
  title,
  message,
}: {
  variant: 'warning' | 'danger';
  icon: typeof AlertTriangle;
  title: string;
  message: string;
}) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };
  const iconBg = {
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 animate-slide-in-right',
        styles[variant],
      )}
    >
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0', iconBg[variant])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm opacity-80">{message}</p>
      </div>
    </div>
  );
}

// --- Station Card ---

function StationCard({
  reporting,
  selected,
  onClick,
  delay = 0,
}: {
  reporting: StationReportingStatus;
  selected: boolean;
  onClick: () => void;
  delay?: number;
}) {
  const total = reporting.total_extinguishers || 0;
  const checked = reporting.today_checks || 0;
  const missing = reporting.missing_checks || 0;
  const defective = reporting.defective_today || 0;
  const overdue = reporting.overdue_inspections || 0;
  const upcoming = reporting.upcoming_inspections || 0;

  const allChecked = total > 0 && missing === 0;
  const hasIssues = missing > 0 || defective > 0 || overdue > 0;
  const reportingPct = total > 0 ? Math.round((checked / total) * 100) : 0;
  const isAllGood = allChecked && defective === 0 && overdue === 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-2xl bg-white border p-5 shadow-sm transition-all hover:shadow-md count-up',
        selected ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200 hover:border-slate-300',
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            isAllGood ? 'bg-emerald-50' : 'bg-slate-100',
          )}>
            <Building2 className={cn('h-5 w-5', isAllGood ? 'text-emerald-600' : 'text-slate-600')} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{reporting.station_name}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {reporting.station_city || '—'}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            isAllGood
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
              : 'bg-red-50 text-red-700 ring-1 ring-red-200/60',
          )}
        >
          {isAllGood ? (
            <><CheckCircle2 className="h-3.5 w-3.5" />OK</>
          ) : (
            <><AlertTriangle className="h-3.5 w-3.5" />Action</>
          )}
        </span>
      </div>

      {/* Progress bar with percentage */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-medium">Saisies du jour</span>
          <span className="tabular-nums">
            <span className={cn('font-bold', isAllGood ? 'text-emerald-600' : missing > 0 ? 'text-amber-600' : 'text-slate-600')}>
              {checked}
            </span>
            <span className="text-slate-400">/{total}</span>
            <span className="ml-1.5 text-slate-400">({reportingPct}%)</span>
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              isAllGood ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : missing > 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-slate-300 to-slate-400',
            )}
            style={{ width: `${reportingPct}%` }}
          />
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        {missing > 0 && (
          <StatusChip icon={AlertTriangle} label={`${missing} manquant(s)`} color="amber" />
        )}
        {defective > 0 && (
          <StatusChip icon={XCircle} label={`${defective} défectueux`} color="red" />
        )}
        {overdue > 0 && (
          <StatusChip icon={CalendarClock} label={`${overdue} retard`} color="red" />
        )}
        {upcoming > 0 && (
          <StatusChip icon={Clock} label={`${upcoming} à venir`} color="amber" />
        )}
        {!hasIssues && total > 0 && (
          <StatusChip icon={ShieldCheck} label="Tout est en ordre" color="emerald" />
        )}
        {total === 0 && (
          <StatusChip icon={AlertTriangle} label="Aucun extincteur" color="slate" />
        )}
      </div>
    </button>
  );
}

function StatusChip({
  icon: Icon,
  label,
  color,
}: {
  icon: typeof AlertTriangle;
  label: string;
  color: 'amber' | 'red' | 'emerald' | 'slate';
}) {
  const colors = {
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
    slate: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200/60',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', colors[color])}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// --- Extinguisher Card ---

function ExtinguisherCard({
  ext,
  showStation,
  delay = 0,
}: {
  ext: ExtinguisherWithStatus;
  showStation: boolean;
  delay?: number;
}) {
  const inspState = inspectionState(ext.next_inspection_date);
  const inspDays = daysUntil(ext.next_inspection_date);
  const isIssue = ext.todayStatus !== 'good';

  return (
    <div
      className={cn(
        'rounded-xl bg-white border p-4 shadow-sm transition-all hover:shadow-md count-up',
        isIssue ? 'border-red-200 ring-1 ring-red-200/60' : 'border-slate-200 hover:border-slate-300',
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <BlinkingDot status={ext.todayStatus} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{ext.label}</p>
          <p className="text-xs text-slate-400 truncate">
            {ext.type} · {ext.pressure_type} · {ext.capacity}
          </p>
          {showStation && ext.station && (
            <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {ext.station.name}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Emplacement</span>
          <span className="text-slate-600 font-medium truncate ml-2">{ext.location || '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">État du jour</span>
          <span
            className={cn(
              'font-medium inline-flex items-center gap-1',
              ext.todayStatus === 'good' ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {ext.todayStatus === 'good'
              ? (<><CheckCircle2 className="h-3 w-3" />Bon état</>)
              : ext.todayStatus === 'defective'
                ? (<><XCircle className="h-3 w-3" />Défectueux</>)
                : (<><AlertTriangle className="h-3 w-3" />Non vérifié</>)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Prochaine inspection</span>
          <span
            className={cn(
              'font-medium',
              inspState === 'overdue' ? 'text-red-600'
                : inspState === 'upcoming' ? 'text-amber-600'
                : 'text-slate-600',
            )}
          >
            {formatDate(ext.next_inspection_date)}
            {inspDays !== null && inspDays < 0 && (
              <span className="ml-1 text-red-500 font-bold">({inspDays}j)</span>
            )}
            {inspDays !== null && inspDays >= 0 && inspDays <= INSPECTION_WARNING_DAYS && (
              <span className="ml-1 text-amber-500 font-bold">(J-{inspDays})</span>
            )}
          </span>
        </div>
      </div>

      {ext.todayCheck?.comment && (
        <div className="mt-2.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 italic border-l-2 border-slate-200">
          "{ext.todayCheck.comment}"
        </div>
      )}
    </div>
  );
}

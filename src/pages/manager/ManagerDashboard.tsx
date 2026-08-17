import { useEffect, useState, useCallback } from 'react';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CalendarClock,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { ExtinguisherWithStatus, ExtinguisherLiveStatus } from '@/lib/types';
import { BlinkingDot } from '@/components/BlinkingDot';
import { cn, formatDate, daysUntil, inspectionState } from '@/lib/utils';
import { INSPECTION_WARNING_DAYS } from '@/lib/constants';
import type { PageKey } from '@/components/Layout';

export function ManagerDashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { profile } = useAuth();
  const [extinguishers, setExtinguishers] = useState<ExtinguisherWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile?.station_id) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const [extRes, checksRes] = await Promise.all([
      supabase
        .from('extinguishers')
        .select('*')
        .eq('station_id', profile.station_id)
        .eq('active', true)
        .order('label'),
      supabase
        .from('daily_checks')
        .select('*')
        .eq('station_id', profile.station_id)
        .eq('check_date', today),
    ]);

    const checksMap = new Map<string, any>();
    (checksRes.data || []).forEach((c) => checksMap.set(c.extinguisher_id, c));

    const withStatus: ExtinguisherWithStatus[] = (extRes.data || []).map((e: any) => {
      const todayCheck = checksMap.get(e.id) || null;
      const todayStatus: ExtinguisherLiveStatus = todayCheck ? todayCheck.status : 'missing';
      return { ...e, todayStatus, todayCheck };
    });
    setExtinguishers(withStatus);
    setLoading(false);
  }, [profile?.station_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = extinguishers.length;
  const checked = extinguishers.filter((e) => e.todayStatus !== 'missing').length;
  const missing = extinguishers.filter((e) => e.todayStatus === 'missing').length;
  const defective = extinguishers.filter((e) => e.todayStatus === 'defective').length;
  const overdueInspections = extinguishers.filter((e) => inspectionState(e.next_inspection_date) === 'overdue').length;
  const upcomingInspections = extinguishers.filter((e) => inspectionState(e.next_inspection_date) === 'upcoming').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ma station</h1>
        <p className="text-slate-500 mt-1">{total} extincteur(s) à vérifier aujourd'hui</p>
      </div>

      {/* Action banner */}
      {missing > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Saisie du jour incomplète</p>
                <p className="text-sm text-amber-700">
                  {missing} extincteur(s) n'ont pas encore été vérifiés aujourd'hui.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('daily-check')}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition shadow-sm"
            >
              <ClipboardCheck className="h-4 w-4" />
              Faire la saisie
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {missing === 0 && total > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900">Saisie du jour complétée</p>
              <p className="text-sm text-emerald-700">
                Tous les extincteurs ont été vérifiés aujourd'hui. Merci !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKpi label="Total" value={total} icon={Flame} color="slate" />
        <MiniKpi label="Vérifiés" value={checked} icon={CheckCircle2} color="emerald" />
        <MiniKpi
          label="Manquants"
          value={missing}
          icon={AlertTriangle}
          color={missing > 0 ? 'amber' : 'emerald'}
        />
        <MiniKpi
          label="Défectueux"
          value={defective}
          icon={XCircle}
          color={defective > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* Inspection alerts */}
      {(overdueInspections > 0 || upcomingInspections > 0) && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-600" />
            Inspections réglementaires
          </h2>
          <div className="flex flex-wrap gap-2">
            {overdueInspections > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                <XCircle className="h-4 w-4" />
                {overdueInspections} inspection(s) en retard
              </span>
            )}
            {upcomingInspections > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
                <CalendarClock className="h-4 w-4" />
                {upcomingInspections} à venir ≤ {INSPECTION_WARNING_DAYS} jours
              </span>
            )}
          </div>
        </div>
      )}

      {/* Extinguisher grid */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-red-500" />
          État des extincteurs — Aujourd'hui
        </h2>
        {extinguishers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Aucun extincteur actif assigné à votre station.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {extinguishers.map((ext) => (
              <ManagerExtCard key={ext.id} ext={ext} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Flame;
  color: 'slate' | 'emerald' | 'amber' | 'red';
}) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colors[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={cn('text-2xl font-bold', colors[color].split(' ')[1])}>{value}</p>
    </div>
  );
}

function ManagerExtCard({ ext }: { ext: ExtinguisherWithStatus }) {
  const inspState = inspectionState(ext.next_inspection_date);
  const inspDays = daysUntil(ext.next_inspection_date);

  return (
    <div
      className={cn(
        'rounded-xl bg-white border p-4 shadow-sm transition-all hover:shadow-md',
        ext.todayStatus === 'good' ? 'border-slate-200' : 'border-red-200 ring-1 ring-red-200',
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <BlinkingDot status={ext.todayStatus} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{ext.label}</p>
          <p className="text-xs text-slate-400 truncate">{ext.type} · {ext.pressure_type} · {ext.capacity}</p>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Emplacement</span>
          <span className="text-slate-600 font-medium truncate ml-2">{ext.location || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">État du jour</span>
          <span
            className={cn(
              'font-medium',
              ext.todayStatus === 'good' ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {ext.todayStatus === 'good' ? 'Bon état' : ext.todayStatus === 'defective' ? 'Défectueux' : 'Non vérifié'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Inspection</span>
          <span
            className={cn(
              'font-medium',
              inspState === 'overdue' ? 'text-red-600' : inspState === 'upcoming' ? 'text-amber-600' : 'text-slate-600',
            )}
          >
            {formatDate(ext.next_inspection_date)}
            {inspDays !== null && inspDays < 0 && <span className="ml-1 text-red-500">({inspDays}j)</span>}
            {inspDays !== null && inspDays >= 0 && inspDays <= INSPECTION_WARNING_DAYS && (
              <span className="ml-1 text-amber-500">(J-{inspDays})</span>
            )}
          </span>
        </div>
      </div>
      {ext.todayCheck?.comment && (
        <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500 italic">
          "{ext.todayCheck.comment}"
        </div>
      )}
    </div>
  );
}

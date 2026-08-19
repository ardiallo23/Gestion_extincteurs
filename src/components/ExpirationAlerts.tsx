import { useMemo, useState } from 'react';
import { CalendarClock, TriangleAlert as AlertTriangle, Circle as XCircle, ChevronDown, ChevronRight, MapPin, Flame } from 'lucide-react';
import type { Extinguisher } from '@/lib/types';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import { EXPIRATION_ALERT_DAYS } from '@/lib/constants';

type ExpirationLevel = 'overdue' | 'critical' | 'warning' | 'ok';

function getLevel(nextDate: string | null | undefined): ExpirationLevel {
  const days = daysUntil(nextDate);
  if (days === null) return 'ok';
  if (days < 0) return 'overdue';
  if (days <= 30) return 'critical';
  if (days <= EXPIRATION_ALERT_DAYS) return 'warning';
  return 'ok';
}

const LEVEL_STYLES: Record<ExpirationLevel, { dot: string; text: string; bg: string; ring: string; label: string }> = {
  overdue: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200', label: 'Expiré' },
  critical: { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200', label: 'Urgent (≤ 30j)' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200', label: 'À planifier (≤ 90j)' },
  ok: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200', label: 'Valide' },
};

interface AlertItem {
  extinguisher: Extinguisher;
  level: ExpirationLevel;
  daysLeft: number | null;
}

export function ExpirationAlerts({ extinguishers, showStation = false }: { extinguishers: Extinguisher[]; showStation?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'critical' | 'warning'>('all');

  const alerts = useMemo(() => {
    const items: AlertItem[] = extinguishers
      .filter((e) => e.active)
      .map((e) => ({
        extinguisher: e,
        level: getLevel(e.next_inspection_date),
        daysLeft: daysUntil(e.next_inspection_date),
      }))
      .filter((item) => item.level !== 'ok')
      .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
    return items;
  }, [extinguishers]);

  const counts = useMemo(() => ({
    overdue: alerts.filter((a) => a.level === 'overdue').length,
    critical: alerts.filter((a) => a.level === 'critical').length,
    warning: alerts.filter((a) => a.level === 'warning').length,
  }), [alerts]);

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.level === filter);

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Aucune expiration à venir</p>
            <p className="text-sm text-emerald-700">
              Tous les extincteurs ont une inspection valide au-delà de {EXPIRATION_ALERT_DAYS} jours.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalAlerts = alerts.length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            counts.overdue > 0 ? 'bg-red-100' : counts.critical > 0 ? 'bg-orange-100' : 'bg-amber-100',
          )}>
            <AlertTriangle className={cn(
              'h-5 w-5',
              counts.overdue > 0 ? 'text-red-600' : counts.critical > 0 ? 'text-orange-600' : 'text-amber-600',
            )} />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-slate-900">Alertes d'expiration</h2>
            <p className="text-xs text-slate-500">
              {totalAlerts} extincteur{totalAlerts > 1 ? 's' : ''} à traiter dans les {EXPIRATION_ALERT_DAYS} jours
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick count badges */}
          {counts.overdue > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              <XCircle className="h-3 w-3" />{counts.overdue}
            </span>
          )}
          {counts.critical > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
              <AlertTriangle className="h-3 w-3" />{counts.critical}
            </span>
          )}
          {counts.warning > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <CalendarClock className="h-3 w-3" />{counts.warning}
            </span>
          )}
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-0.5 w-fit">
            {([
              { key: 'all' as const, label: 'Tous', count: totalAlerts, color: 'slate' },
              { key: 'overdue' as const, label: 'Expirés', count: counts.overdue, color: 'red' },
              { key: 'critical' as const, label: 'Urgent', count: counts.critical, color: 'orange' },
              { key: 'warning' as const, label: 'À planifier', count: counts.warning, color: 'amber' },
            ]).filter((t) => t.count > 0 || t.key === 'all').map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  filter === tab.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
                <span className={cn(
                  'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  tab.color === 'red' ? 'bg-red-100 text-red-700'
                    : tab.color === 'orange' ? 'bg-orange-100 text-orange-700'
                    : tab.color === 'amber' ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-200 text-slate-600',
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Alert list */}
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-sm text-slate-400">Aucune alerte dans cette catégorie.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filtered.map((item) => {
                const ext = item.extinguisher;
                const level = LEVEL_STYLES[item.level];
                const days = item.daysLeft;
                return (
                  <div
                    key={ext.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm',
                      level.bg, level.ring, 'ring-1',
                    )}
                  >
                    {/* Level dot */}
                    <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', level.dot)} />

                    {/* Extinguisher info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Flame className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <p className="font-semibold text-slate-800 text-sm truncate">{ext.label}</p>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">· {ext.type} · {ext.capacity}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {showStation && ext.station && (
                          <span className="text-xs text-slate-500 flex items-center gap-0.5 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {ext.station.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 truncate">{ext.location || '—'}</span>
                      </div>
                    </div>

                    {/* Expiration date */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-slate-600 tabular-nums">
                        {formatDate(ext.next_inspection_date)}
                      </p>
                      <p className={cn('text-xs font-bold tabular-nums', level.text)}>
                        {days !== null && days < 0 ? `${days}j` : days !== null ? `J-${days}` : '—'}
                      </p>
                    </div>

                    {/* Level badge */}
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap',
                      level.bg, level.text,
                    )}>
                      {level.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

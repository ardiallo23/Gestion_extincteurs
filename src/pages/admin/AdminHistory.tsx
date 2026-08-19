import { useEffect, useState, useCallback } from 'react';
import { History, Filter, MapPin, FireExtinguisher, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DailyCheck, Station } from '@/lib/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

export function AdminHistory() {
  const [checks, setChecks] = useState<(DailyCheck & { extinguisher?: any; station?: any })[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStation, setFilterStation] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const loadChecks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('daily_checks')
      .select('*, extinguisher:extinguishers(*), station:stations(*)')
      .order('check_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    if (filterStation !== 'all') {
      query = query.eq('station_id', filterStation);
    }
    if (filterDate) {
      query = query.eq('check_date', filterDate);
    }

    const [checksRes, stRes] = await Promise.all([
      query,
      supabase.from('stations').select('*').order('name'),
    ]);

    setChecks((checksRes.data as any[]) || []);
    setStations(stRes.data || []);
    setLoading(false);
  }, [filterStation, filterDate]);

  useEffect(() => {
    loadChecks();
  }, [loadChecks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Group by date
  const grouped = checks.reduce((acc, c) => {
    const key = c.check_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {} as Record<string, typeof checks>);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historique des saisies</h1>
        <p className="text-slate-500 mt-1">{checks.length} saisie(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
          >
            <option value="all">Toutes les stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-sm text-slate-400 hover:text-slate-600 whitespace-nowrap"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* History grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
          Aucune saisie trouvée.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Calendar className="h-4 w-4 text-slate-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{formatDate(date)}</h2>
                <span className="text-sm text-slate-400">({grouped[date].length} saisies)</span>
              </div>
              <div className="lg:hidden space-y-2">
                {grouped[date].map((c) => (
                  <div key={c.id} className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FireExtinguisher className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-slate-900">{c.extinguisher?.label || '—'}</div>
                          <div className="text-xs text-slate-400">{c.station?.name}</div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                          c.status === 'good'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700',
                        )}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            c.status === 'good' ? 'bg-emerald-500' : 'bg-red-500',
                          )}
                        />
                        {c.status === 'good' ? 'Bon état' : 'Défectueux'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <BoolBadge ok={c.pressure_ok} label="Pression" />
                      <BoolBadge ok={c.seal_ok} label="Plombage" />
                      <BoolBadge ok={c.accessible} label="Accès" />
                    </div>
                    {c.comment && (
                      <p className="text-xs text-slate-500 italic mt-2">{c.comment}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="hidden lg:block overflow-x-auto rounded-xl bg-white border border-slate-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Extincteur</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden md:table-cell">Station</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">État</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden lg:table-cell">Pression</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden lg:table-cell">Plombage</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden lg:table-cell">Accessibilité</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden md:table-cell">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grouped[date].map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <FireExtinguisher className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-slate-900">{c.extinguisher?.label || '—'}</div>
                              <div className="text-xs text-slate-400 md:hidden">{c.station?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-slate-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {c.station?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                              c.status === 'good'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700',
                            )}
                          >
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full',
                                c.status === 'good' ? 'bg-emerald-500' : 'bg-red-500',
                              )}
                            />
                            {c.status === 'good' ? 'Bon état' : 'Défectueux'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <BoolBadge ok={c.pressure_ok} />
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <BoolBadge ok={c.seal_ok} />
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell">
                          <BoolBadge ok={c.accessible} />
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell text-slate-500 italic max-w-xs truncate">
                          {c.comment || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BoolBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
      )}
    >
      {label && <span className="opacity-60">{label}:</span>}
      {ok ? 'OK' : 'Non'}
    </span>
  );
}

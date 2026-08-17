import { useEffect, useState, useCallback } from 'react';
import { History, Calendar, FireExtinguisher } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { DailyCheck } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export function ManagerHistory() {
  const { profile } = useAuth();
  const [checks, setChecks] = useState<(DailyCheck & { extinguisher?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  const loadChecks = useCallback(async () => {
    if (!profile?.station_id) return;
    setLoading(true);
    let query = supabase
      .from('daily_checks')
      .select('*, extinguisher:extinguishers(*)')
      .eq('station_id', profile.station_id)
      .order('check_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);

    if (filterDate) {
      query = query.eq('check_date', filterDate);
    }

    const { data } = await query;
    setChecks((data as any[]) || []);
    setLoading(false);
  }, [profile?.station_id, filterDate]);

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

  const grouped = checks.reduce((acc, c) => {
    if (!acc[c.check_date]) acc[c.check_date] = [];
    acc[c.check_date].push(c);
    return acc;
  }, {} as Record<string, typeof checks>);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historique de ma station</h1>
        <p className="text-slate-500 mt-1">{checks.length} saisie(s)</p>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <Calendar className="h-4 w-4 text-slate-400" />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition"
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate('')}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Effacer
          </button>
        )}
      </div>

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
              <div className="hidden sm:block overflow-x-auto rounded-xl bg-white border border-slate-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Extincteur</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">État</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden sm:table-cell">Pression</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden sm:table-cell">Plombage</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden sm:table-cell">Access.</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600 hidden lg:table-cell">Commentaire</th>
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
                              <div className="text-xs text-slate-400">{c.extinguisher?.location}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                              c.status === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
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
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <BoolBadge ok={c.pressure_ok} />
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <BoolBadge ok={c.seal_ok} />
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <BoolBadge ok={c.accessible} />
                        </td>
                        <td className="px-4 py-2.5 hidden lg:table-cell text-slate-500 italic max-w-xs truncate">
                          {c.comment || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="sm:hidden space-y-2">
                {grouped[date].map((c) => (
                  <div key={c.id} className="rounded-xl bg-white border border-slate-200 shadow-sm p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FireExtinguisher className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 text-sm truncate">{c.extinguisher?.label || '—'}</div>
                          <div className="text-xs text-slate-400 truncate">{c.extinguisher?.location}</div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0',
                          c.status === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', c.status === 'good' ? 'bg-emerald-500' : 'bg-red-500')} />
                        {c.status === 'good' ? 'Bon' : 'Déf.'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <BoolBadge ok={c.pressure_ok} label="Pression" />
                      <BoolBadge ok={c.seal_ok} label="Plomb" />
                      <BoolBadge ok={c.accessible} label="Accès" />
                    </div>
                    {c.comment && (
                      <div className="mt-2 text-xs text-slate-500 italic">"{c.comment}"</div>
                    )}
                  </div>
                ))}
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
      {label && <span className="text-slate-400">{label}:</span>}
      {ok ? 'OK' : 'Non'}
    </span>
  );
}

import { useMemo, useState } from 'react';
import { Flame, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StationRegion } from '@/lib/types';
import { useRegionData } from '@/lib/hooks/useRegionData';

const REGION_LABELS: Record<StationRegion, string> = {
  Conakry: 'Conakry',
  MG: 'Moyenne Guinée',
  HG: 'Haute Guinée',
  GF: 'Guinée Forestière',
  BG: 'Basse Guinée',
};

const REGION_ORDER: StationRegion[] = ['Conakry', 'MG', 'HG', 'GF', 'BG'];

const TYPE_COLORS: Record<string, { from: string; to: string; solid: string; light: string }> = {
  Poudre: { from: 'from-red-500', to: 'to-red-600', solid: '#ef4444', light: '#fecaca' },
  CO2: { from: 'from-sky-500', to: 'to-sky-600', solid: '#0ea5e9', light: '#bae6fd' },
  Eau: { from: 'from-emerald-500', to: 'to-emerald-600', solid: '#10b981', light: '#a7f3d0' },
  'Non renseigné': { from: 'from-slate-400', to: 'to-slate-500', solid: '#94a3b8', light: '#e2e8f0' },
};

const TYPE_ORDER = ['Poudre', 'CO2', 'Eau', 'Non renseigné'];

interface RegionRow {
  region: StationRegion;
  type: string;
  total: number;
  compliant: number;
  non_compliant: number;
}

export function ExtinguisherRegionChart() {
  const { data, loading } = useRegionData();
  const [hovered, setHovered] = useState<{ region: string; type: string } | null>(null);

  const { regions, maxTotal, totals } = useMemo(() => {
    const byRegion = new Map<StationRegion, Map<string, { total: number; compliant: number; non_compliant: number }>>();
    const regionTotals = new Map<StationRegion, number>();
    let max = 0;

    for (const row of data) {
      if (!byRegion.has(row.region)) byRegion.set(row.region, new Map());
      const typeMap = byRegion.get(row.region)!;
      typeMap.set(row.type, {
        total: row.total,
        compliant: row.compliant,
        non_compliant: row.non_compliant,
      });
      const t = (regionTotals.get(row.region) || 0) + row.total;
      regionTotals.set(row.region, t);
      if (t > max) max = t;
    }

    const orderedRegions = REGION_ORDER.filter((r) => byRegion.has(r));
    return { regions: orderedRegions, maxTotal: max || 1, totals: regionTotals };
  }, [data]);

  const grandTotal = useMemo(() => Array.from(totals.values()).reduce((s, v) => s + v, 0), [totals]);
  const grandCompliant = useMemo(() => data.reduce((s, r) => s + r.compliant, 0), [data]);
  const grandNonCompliant = useMemo(() => data.reduce((s, r) => s + r.non_compliant, 0), [data]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-red-50">
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Extincteurs par région</h2>
            <p className="text-xs text-slate-500">Chargement…</p>
          </div>
        </div>
        <div className="p-10 flex items-center justify-center">
          <span className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (regions.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-red-50">
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Extincteurs par région</h2>
            <p className="text-xs text-slate-500">Aucune donnée disponible</p>
          </div>
        </div>
        <div className="p-10 text-center text-sm text-slate-400">
          Aucun extincteur actif avec région assignée pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-red-50">
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Extincteurs par région</h2>
            <p className="text-xs text-slate-500">Conformité et types d'extincteurs par région</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-600 tabular-nums">{grandCompliant}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <span className="text-sm font-bold text-red-600 tabular-nums">{grandNonCompliant}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
            <span className="text-xs font-medium text-slate-500">Total</span>
            <span className="text-sm font-bold text-slate-700 tabular-nums">{grandTotal}</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Chart area */}
        <div className="space-y-5">
          {regions.map((region, rIdx) => {
            const typeMap = data.filter((d) => d.region === region);
            const regionTotal = totals.get(region) || 0;
            const regionCompliant = typeMap.reduce((s, d) => s + d.compliant, 0);
            const regionNonCompliant = typeMap.reduce((s, d) => s + d.non_compliant, 0);
            const regionPct = regionTotal > 0 ? Math.round((regionCompliant / regionTotal) * 100) : 0;

            return (
              <div key={region} className="count-up" style={{ animationDelay: `${rIdx * 0.08}s` }}>
                {/* Region header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">{REGION_LABELS[region] || region}</span>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500">
                      {region}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 tabular-nums">
                      <span className="font-bold text-emerald-600">{regionCompliant}</span>
                      <span className="text-slate-300 mx-0.5">/</span>
                      <span className="font-bold text-slate-600">{regionTotal}</span>
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                      regionPct === 100 ? 'bg-emerald-100 text-emerald-700'
                        : regionPct >= 50 ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700',
                    )}>
                      {regionPct}%
                    </span>
                  </div>
                </div>

                {/* Stacked bar by type */}
                <div className="relative h-9 rounded-lg bg-slate-100 overflow-hidden flex">
                  {TYPE_ORDER.filter((t) => typeMap.some((d) => d.type === t)).map((type) => {
                    const row = typeMap.find((d) => d.type === type);
                    if (!row) return null;
                    const widthPct = (row.total / maxTotal) * 100;
                    const compliantPct = row.total > 0 ? (row.compliant / row.total) * 100 : 0;
                    const nonCompliantPct = row.total > 0 ? (row.non_compliant / row.total) * 100 : 0;
                    const colors = TYPE_COLORS[type] || TYPE_COLORS['Non renseigné'];
                    const isHovered = hovered?.region === region && hovered?.type === type;

                    return (
                      <div
                        key={type}
                        className="relative h-full transition-all duration-700 ease-out flex-shrink-0"
                        style={{ width: `${widthPct}%` }}
                        onMouseEnter={() => setHovered({ region, type })}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {/* Compliant portion (solid color) */}
                        <div
                          className={cn('absolute left-0 top-0 bottom-0 bg-gradient-to-r transition-all', colors.from, colors.to)}
                          style={{ width: `${compliantPct}%` }}
                        />
                        {/* Non-compliant portion (hatched red overlay) */}
                        {row.non_compliant > 0 && (
                          <div
                            className="absolute top-0 bottom-0 right-0 bg-gradient-to-r from-red-400 to-red-500"
                            style={{ width: `${nonCompliantPct}%` }}
                          />
                        )}
                        {/* Type label inside segment */}
                        {widthPct > 8 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white tabular-nums drop-shadow-sm">
                              {row.total}
                            </span>
                          </div>
                        )}
                        {/* Hover tooltip */}
                        {isHovered && (
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-xl pointer-events-none">
                            <p className="font-semibold">{type}</p>
                            <p className="text-slate-300 mt-0.5">{REGION_LABELS[region] || region}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-emerald-400 font-medium">Conformes: {row.compliant}</span>
                              <span className="text-red-400 font-medium">Non conformes: {row.non_compliant}</span>
                            </div>
                            <p className="text-slate-400 mt-0.5">Total: {row.total}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Type breakdown chips */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {TYPE_ORDER.filter((t) => typeMap.some((d) => d.type === t)).map((type) => {
                    const row = typeMap.find((d) => d.type === type)!;
                    const colors = TYPE_COLORS[type] || TYPE_COLORS['Non renseigné'];
                    return (
                      <div
                        key={type}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-100 px-2 py-1"
                        onMouseEnter={() => setHovered({ region, type })}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <div className={cn('h-2.5 w-2.5 rounded-sm bg-gradient-to-r', colors.from, colors.to)} />
                        <span className="text-[11px] font-medium text-slate-600">{type}</span>
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums">{row.total}</span>
                        {row.non_compliant > 0 && (
                          <span className="text-[10px] font-bold text-red-500 tabular-nums">−{row.non_compliant}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-3 border-t border-slate-100">
          {TYPE_ORDER.filter((t) => data.some((d) => d.type === t)).map((type) => {
            const colors = TYPE_COLORS[type] || TYPE_COLORS['Non renseigné'];
            return (
              <div key={type} className="flex items-center gap-1.5">
                <div className={cn('h-3 w-3 rounded bg-gradient-to-r', colors.from, colors.to)} />
                <span className="text-xs font-medium text-slate-600">{type}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gradient-to-r from-red-400 to-red-500" />
            <span className="text-xs font-medium text-slate-600">Non conforme</span>
          </div>
        </div>
      </div>
    </div>
  );
}

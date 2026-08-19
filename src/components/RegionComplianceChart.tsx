import { useMemo, useState } from 'react';
import { Map as MapIcon, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { StationCompliance, StationRegion } from '@/lib/types';
import { cn } from '@/lib/utils';

const RULE_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'] as const;

const REGION_LABELS: Record<StationRegion, string> = {
  Conakry: 'Conakry',
  MG: 'Moyenne Guinée',
  HG: 'Haute Guinée',
  GF: 'Guinée Forestière',
  BG: 'Basse Guinée',
};

function isCompliant(c: StationCompliance): boolean {
  return RULE_KEYS.every((k) => {
    const expected = c[`${k}_expected` as keyof StationCompliance] as number;
    const actual = c[`${k}_actual` as keyof StationCompliance] as number;
    return actual >= expected;
  });
}

interface RegionDatum {
  region: StationRegion;
  label: string;
  total: number;
  compliant: number;
  nonCompliant: number;
}

export function RegionComplianceChart({ compliance }: { compliance: StationCompliance[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const data = useMemo<RegionDatum[]>(() => {
    const map = new Map<StationRegion, RegionDatum>();
    for (const c of compliance) {
      const r = c.station_region;
      if (!r) continue;
      if (!map.has(r)) {
        map.set(r, {
          region: r,
          label: REGION_LABELS[r] || r,
          total: 0,
          compliant: 0,
          nonCompliant: 0,
        });
      }
      const entry = map.get(r)!;
      entry.total += 1;
      if (isCompliant(c)) entry.compliant += 1;
      else entry.nonCompliant += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [compliance]);

  const maxTotal = Math.max(1, ...data.map((d) => d.total));
  const totalStations = data.reduce((s, d) => s + d.total, 0);
  const totalCompliant = data.reduce((s, d) => s + d.compliant, 0);
  const overallPct = totalStations > 0 ? Math.round((totalCompliant / totalStations) * 100) : 0;

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50">
            <MapIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Conformité par région</h2>
            <p className="text-xs text-slate-500">Aucune donnée disponible</p>
          </div>
        </div>
        <div className="p-10 text-center text-sm text-slate-400">
          Aucune station avec région assignée pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50">
            <MapIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Conformité par région</h2>
            <p className="text-xs text-slate-500">Stations totales et conformes, par région</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100">
          <span className="text-xs font-medium text-slate-500">Conformité globale</span>
          <span className={cn(
            'text-sm font-bold tabular-nums',
            overallPct >= 80 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600',
          )}>{overallPct}%</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {data.map((d, idx) => {
          const pct = d.total > 0 ? Math.round((d.compliant / d.total) * 100) : 0;
          const totalWidth = (d.total / maxTotal) * 100;
          const compliantWidth = d.total > 0 ? (d.compliant / d.total) * totalWidth : 0;
          const nonCompliantWidth = d.total > 0 ? (d.nonCompliant / d.total) * totalWidth : 0;
          const isHovered = hovered === d.region;

          return (
            <div
              key={d.region}
              className="group count-up"
              style={{ animationDelay: `${idx * 0.08}s` }}
              onMouseEnter={() => setHovered(d.region)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{d.label}</span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500">
                    {d.region}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 tabular-nums">
                    <span className="font-bold text-emerald-600">{d.compliant}</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="font-bold text-slate-600">{d.total}</span>
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                    pct === 100 ? 'bg-emerald-100 text-emerald-700'
                      : pct >= 50 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700',
                  )}>
                    {pct === 100 ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                    {pct}%
                  </span>
                </div>
              </div>

              <div className="relative h-7 rounded-lg bg-slate-100 overflow-hidden">
                {/* Total bar outline (yellow) — shows total scale */}
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 border-2 border-dashed transition-all duration-700 ease-out rounded-lg',
                    isHovered ? 'border-amber-500' : 'border-amber-400',
                  )}
                  style={{ width: `${totalWidth}%`, backgroundColor: 'rgba(251, 191, 36, 0.12)' }}
                />
                {/* Non-compliant portion (red) */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-500 to-red-600 transition-all duration-700 ease-out"
                  style={{ width: `${nonCompliantWidth}%` }}
                />
                {/* Compliant portion (green) */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out"
                  style={{ width: `${compliantWidth}%` }}
                />
                {/* Count label inside bar */}
                {d.total > 0 && totalWidth > 12 && (
                  <div className="absolute inset-0 flex items-center justify-start pl-2.5">
                    <span className="text-[11px] font-bold text-white tabular-nums drop-shadow-sm" style={{ opacity: compliantWidth > 10 ? 1 : 0 }}>
                      {d.compliant} conforme{d.compliant > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <span className="text-xs font-medium text-slate-600">Conformes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-gradient-to-r from-red-500 to-red-600" />
            <span className="text-xs font-medium text-slate-600">Non conformes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded border-2 border-dashed border-amber-400" style={{ backgroundColor: 'rgba(251, 191, 36, 0.12)' }} />
            <span className="text-xs font-medium text-slate-600">Total stations</span>
          </div>
        </div>
      </div>
    </div>
  );
}



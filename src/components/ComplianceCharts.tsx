import { useState, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  LayoutGrid, Zap, Wrench, Droplets, Fuel, Plug, ShoppingBag,
  TrendingUp, TrendingDown, Minus, Target, Gauge,
} from 'lucide-react';
import type { StationCompliance } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface RuleDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  expectedField: keyof StationCompliance;
  actualField: keyof StationCompliance;
}

export const LOCATION_SHORT: Record<string, string> = {
  r1: 'Piste',
  r2: 'Local élec.',
  r3: 'Baie service',
  r4: 'Baie lavage',
  r5: 'Dépotage',
  r6: 'Local GE',
  r7: 'Boutique',
};

const RULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  r1: LayoutGrid, r2: Zap, r3: Wrench, r4: Droplets, r5: Fuel, r6: Plug, r7: ShoppingBag,
};

type CellStatus = 'ok' | 'short' | 'surplus';

function getCellStatus(expected: number, actual: number): CellStatus {
  if (actual < expected) return 'short';
  if (actual > expected) return 'surplus';
  return 'ok';
}

const CELL_COLORS: Record<CellStatus, { bg: string; border: string; text: string; hoverBg: string }> = {
  ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
  short: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hoverBg: 'hover:bg-red-100' },
  surplus: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hoverBg: 'hover:bg-amber-100' },
};

// --- Compliance Heatmap Matrix ---

export function ComplianceHeatmap({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const ruleStats = useMemo(() => {
    return rules.map((r) => {
      let ok = 0, short = 0, surplus = 0;
      for (const c of compliance) {
        const status = getCellStatus(c[r.expectedField] as number, c[r.actualField] as number);
        if (status === 'ok') ok++;
        else if (status === 'short') short++;
        else surplus++;
      }
      return { key: r.key, ok, short, surplus, total: compliance.length };
    });
  }, [compliance, rules]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
          <LayoutGrid className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Matrice de conformité</h2>
          <p className="text-xs text-slate-500">Vue d'ensemble — chaque cellule représente une règle par station</p>
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <table className="w-full border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white min-w-[160px] text-left pr-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Station</span>
              </th>
              {rules.map((r) => {
                const Icon = RULE_ICONS[r.key] || LayoutGrid;
                const stat = ruleStats.find((s) => s.key === r.key)!;
                return (
                  <th key={r.key} className="text-center min-w-[64px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100">
                        <Icon className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 leading-tight">{LOCATION_SHORT[r.key]}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {stat.short > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-400" title={`${stat.short} manquant(s)`} />}
                        {stat.surplus > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title={`${stat.surplus} surplus`} />}
                        {stat.ok === stat.total && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                      </div>
                    </div>
                  </th>
                );
              })}
              <th className="text-center min-w-[70px]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Score</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((c, rowIdx) => {
              const passCount = rules.filter((r) => getCellStatus(c[r.expectedField] as number, c[r.actualField] as number) === 'ok').length;
              const pct = Math.round((passCount / rules.length) * 100);

              return (
                <tr key={c.station_id} className="group count-up" style={{ animationDelay: `${rowIdx * 0.04}s` }}>
                  <td className="sticky left-0 z-10 bg-white pr-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{c.station_name}</span>
                    </div>
                  </td>
                  {rules.map((r) => {
                    const expected = c[r.expectedField] as number;
                    const actual = c[r.actualField] as number;
                    const status = getCellStatus(expected, actual);
                    const colors = CELL_COLORS[status];
                    const cellKey = `${c.station_id}-${r.key}`;
                    const isHovered = hoveredCell === cellKey;

                    return (
                      <td key={r.key} className="text-center p-0">
                        <div
                          onMouseEnter={() => setHoveredCell(cellKey)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={cn(
                            'relative rounded-lg border transition-all cursor-default',
                            colors.bg, colors.border, colors.hoverBg,
                            isHovered ? 'scale-110 shadow-md z-20 ring-2 ring-offset-1' : '',
                            isHovered && status === 'ok' && 'ring-emerald-300',
                            isHovered && status === 'short' && 'ring-red-300',
                            isHovered && status === 'surplus' && 'ring-amber-300',
                          )}
                          style={{ transformOrigin: 'center' }}
                        >
                          <div className="flex flex-col items-center justify-center py-2 px-1">
                            <span className={cn('text-sm font-bold tabular-nums leading-none', colors.text)}>
                              {actual}
                              <span className="text-slate-400 font-normal text-[10px]">/{expected}</span>
                            </span>
                            {status === 'short' && (
                              <span className="text-[9px] font-bold text-red-500 mt-0.5">−{expected - actual}</span>
                            )}
                            {status === 'surplus' && (
                              <span className="text-[9px] font-bold text-amber-500 mt-0.5">+{actual - expected}</span>
                            )}
                          </div>

                          {isHovered && (
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-xl pointer-events-none">
                              <p className="font-semibold">{r.label}</p>
                              <p className="text-slate-300 mt-0.5">{c.station_name}</p>
                              <p className="mt-1">
                                {status === 'ok' && <span className="text-emerald-400">Conforme — {actual}/{expected}</span>}
                                {status === 'short' && <span className="text-red-400">Manquant — {expected - actual}</span>}
                                {status === 'surplus' && <span className="text-amber-400">Surplus — +{actual - expected}</span>}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-center py-1.5">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        'text-sm font-bold tabular-nums',
                        pct === 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600',
                      )}>
                        {passCount}/{rules.length}
                      </span>
                      <div className="w-12 h-1 rounded-full bg-slate-200 mt-1 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-emerald-200 bg-emerald-50" />
            <span className="text-xs font-medium text-slate-600">Conforme</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-red-200 bg-red-50" />
            <span className="text-xs font-medium text-slate-600">Manquant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded border border-amber-200 bg-amber-50" />
            <span className="text-xs font-medium text-slate-600">Surplus</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Donut Chart ---

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  textColor: string;
}

export function ComplianceDonut({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const segments = useMemo(() => {
    let ok = 0, short = 0, surplus = 0;
    for (const c of compliance) {
      for (const r of rules) {
        const status = getCellStatus(c[r.expectedField] as number, c[r.actualField] as number);
        if (status === 'ok') ok++;
        else if (status === 'short') short++;
        else surplus++;
      }
    }
    return { ok, short, surplus, total: ok + short + surplus };
  }, [compliance, rules]);

  const data: DonutSegment[] = [
    { label: 'Conformes', value: segments.ok, color: '#10b981', bgColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Manquants', value: segments.short, color: '#ef4444', bgColor: 'bg-red-500', textColor: 'text-red-600' },
    { label: 'En surplus', value: segments.surplus, color: '#f59e0b', bgColor: 'bg-amber-500', textColor: 'text-amber-600' },
  ];

  const size = 180;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.total || 1;

  let accumulatedOffset = 0;
  const arcs = data.map((seg) => {
    const fraction = seg.value / total;
    const dashLength = fraction * circumference;
    const arc = {
      ...seg,
      dashLength,
      dashOffset: -accumulatedOffset,
      fraction,
    };
    accumulatedOffset += dashLength;
    return arc;
  });

  const compliancePct = Math.round((segments.ok / total) * 100);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Répartition des contrôles</h2>
          <p className="text-xs text-slate-500">Distribution des statuts sur l'ensemble des règles</p>
        </div>
      </div>

      <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
        {/* Donut SVG */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={stroke}
            />
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
                strokeDashoffset={arc.dashOffset}
                style={{
                  transition: 'stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1), stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              'text-3xl font-bold tabular-nums',
              compliancePct >= 80 ? 'text-emerald-600' : compliancePct >= 50 ? 'text-amber-600' : 'text-red-600',
            )}>
              {compliancePct}%
            </span>
            <span className="text-xs text-slate-400 font-medium">conformité</span>
          </div>
        </div>

        {/* Legend with values */}
        <div className="flex-1 w-full space-y-3">
          {data.map((seg, i) => (
            <div key={i} className="flex items-center justify-between count-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-2.5">
                <div className={cn('h-3 w-3 rounded-full', seg.bgColor)} />
                <span className="text-sm font-medium text-slate-700">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-lg font-bold tabular-nums', seg.textColor)}>{seg.value}</span>
                <span className="text-xs text-slate-400 tabular-nums">
                  {Math.round((seg.value / total) * 100)}%
                </span>
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Total contrôles</span>
              <span className="text-lg font-bold tabular-nums text-slate-700">{segments.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Coverage Gauge Grid ---

export function ComplianceRadar({ compliance, rules }: { compliance: StationCompliance[]; rules: RuleDef[] }) {
  const data = useMemo(() => {
    return rules.map((r) => {
      const expected = compliance.reduce((s, c) => s + (c[r.expectedField] as number), 0);
      const actual = compliance.reduce((s, c) => s + (c[r.actualField] as number), 0);
      const status = getCellStatus(expected, actual);
      const ratio = expected > 0 ? Math.min(Math.round((actual / expected) * 100), 100) : 100;
      return {
        key: r.key,
        label: LOCATION_SHORT[r.key] || r.label,
        fullLabel: r.label,
        expected,
        actual,
        status,
        ratio,
        missing: Math.max(0, expected - actual),
        surplus: Math.max(0, actual - expected),
      };
    });
  }, [compliance, rules]);

  const totalExpected = data.reduce((s, d) => s + d.expected, 0);
  const totalActual = data.reduce((s, d) => s + d.actual, 0);
  const overallRatio = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 100;
  const overallColor = overallRatio >= 100 ? '#059669' : overallRatio >= 70 ? '#d97706' : '#dc2626';
  const totalMissing = data.reduce((s, d) => s + d.missing, 0);
  const totalSurplus = data.reduce((s, d) => s + d.surplus, 0);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-50">
          <Gauge className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Taux de couverture</h2>
          <p className="text-xs text-slate-500">Ratio extincteurs installés / requis par emplacement</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Overall ratio banner */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-100">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Couverture globale</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 tabular-nums">{totalActual} / {totalExpected}</span>
            <span className="text-2xl font-bold tabular-nums" style={{ color: overallColor }}>
              {overallRatio}%
            </span>
          </div>
        </div>

        {/* Gauge grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.map((d, idx) => {
            const Icon = RULE_ICONS[d.key] || LayoutGrid;
            const color = d.status === 'ok' ? '#059669' : d.status === 'short' ? '#dc2626' : '#d97706';
            const colorClass = d.status === 'ok' ? 'text-emerald-600' : d.status === 'short' ? 'text-red-600' : 'text-amber-600';
            const bgColor = d.status === 'ok' ? 'bg-emerald-50' : d.status === 'short' ? 'bg-red-50' : 'bg-amber-50';

            return (
              <div
                key={d.key}
                className="group relative flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/40 p-4 hover:border-slate-200 hover:shadow-sm transition-all count-up"
                style={{ animationDelay: `${idx * 0.07}s` }}
              >
                {/* Icon badge */}
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-2.5 transition-colors', bgColor)}>
                  <Icon className={cn('h-4 w-4', colorClass)} />
                </div>

                {/* Semi-circular gauge */}
                <SemiGauge percent={d.ratio} color={color} />

                {/* Label */}
                <p className="text-xs font-medium text-slate-600 text-center mt-2.5 leading-tight">{d.label}</p>

                {/* Actual/Expected */}
                <p className="text-[11px] text-slate-400 tabular-nums mt-1">
                  {d.actual} / {d.expected}
                </p>

                {/* Status badge */}
                {d.status !== 'ok' && (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums mt-1.5',
                    d.status === 'short' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700',
                  )}>
                    {d.status === 'short' ? (
                      <><TrendingDown className="h-2.5 w-2.5" />−{d.missing}</>
                    ) : (
                      <><TrendingUp className="h-2.5 w-2.5" />+{d.surplus}</>
                    )}
                  </span>
                )}
                {d.status === 'ok' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-600 px-2 py-0.5 text-[10px] font-bold mt-1.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />OK
                  </span>
                )}

                {/* Tooltip on hover */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30 hidden group-hover:block">
                  <div className="rounded-lg bg-slate-900 text-white text-xs px-3 py-2 whitespace-nowrap shadow-xl">
                    <p className="font-semibold">{d.fullLabel}</p>
                    <p className="text-slate-300 mt-0.5">Installés : {d.actual} · Requis : {d.expected}</p>
                    {d.missing > 0 && <p className="text-red-400 font-medium mt-0.5">Manquant : {d.missing}</p>}
                    {d.surplus > 0 && <p className="text-amber-400 font-medium mt-0.5">Surplus : {d.surplus}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary footer */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-400 font-medium">Total installés</p>
            <p className="text-lg font-bold text-slate-700 tabular-nums mt-0.5">{totalActual}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 font-medium">Manquants</p>
            <p className={cn('text-lg font-bold tabular-nums mt-0.5', totalMissing > 0 ? 'text-red-600' : 'text-slate-300')}>{totalMissing}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 font-medium">Surplus</p>
            <p className={cn('text-lg font-bold tabular-nums mt-0.5', totalSurplus > 0 ? 'text-amber-600' : 'text-slate-300')}>{totalSurplus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SemiGauge({ percent, color }: { percent: number; color: string }) {
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 4 }}>
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        {/* Track */}
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
            filter: `drop-shadow(0 1px 2px ${color}33)`,
          }}
        />
      </svg>
      {/* Percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
